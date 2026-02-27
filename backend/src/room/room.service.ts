import { PLAYER_STATUS } from '@/common/constants/player-status.constants';
import { ROOM_STATUS } from '@/common/constants/room-status.constants';
import {
  PlayerStatusType,
  RoomState,
  RoomStatusType,
} from '@/common/types/room-state.type';
import { GameService } from '@/game/game.service';
import { RedisService } from '@/redis/redis.service';
import { DatabaseService } from '@/database/database.service';
import { rooms, roomPlayers } from '@/database/schema';
import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);
  private readonly ROOM_TTL = 60 * 60 * 24; // 24 hours

  constructor(
    @Inject(forwardRef(() => GameService))
    private readonly game: GameService,
    private readonly redis: RedisService,
    private readonly database: DatabaseService,
  ) {}

  async createRoom(userId: string, username: string): Promise<RoomState> {
    const word = this.game.getDailyWord();
    const roomId = uuidv4();

    const room: RoomState = {
      id: roomId,
      hostId: userId,
      word,
      status: ROOM_STATUS.WAITING as RoomStatusType,
      createdAt: new Date(),
      players: [
        {
          id: userId,
          username,
          guesses: 0,
          status: PLAYER_STATUS.PLAYING as PlayerStatusType,
          socketId: '',
        },
      ],
    };

    // Persist to Redis for real-time access
    await this.redis.set(`room:${roomId}`, JSON.stringify(room), this.ROOM_TTL);

    // Persist to database for long-term storage
    try {
      await this.database.db.insert(rooms).values({
        id: roomId,
        hostId: userId,
        word,
        status: ROOM_STATUS.WAITING,
      });

      await this.database.db.insert(roomPlayers).values({
        roomId,
        userId,
        status: PLAYER_STATUS.PLAYING,
        guessCount: 0,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to persist room creation to DB: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return room;
  }

  async joinRoom(
    roomId: string,
    userId: string,
    username: string,
  ): Promise<RoomState> {
    const room = await this.redis.get(`room:${roomId}`);
    if (!room) throw new WsException('Room not found');

    const parsedRoom = JSON.parse(room) as RoomState;
    if (parsedRoom.status === ROOM_STATUS.FINISHED) {
      throw new WsException('Room is finished');
    }

    if (parsedRoom.players.length >= 2) {
      throw new WsException('Room is full');
    }

    if (parsedRoom.players.some((player) => player.id === userId)) {
      throw new WsException('User already in room');
    }

    parsedRoom.players.push({
      id: userId,
      username,
      guesses: 0,
      status: PLAYER_STATUS.PLAYING as PlayerStatusType,
      socketId: '',
    });

    // If room now has 2 players, move to IN_PROGRESS
    if (parsedRoom.players.length === 2) {
      parsedRoom.status = ROOM_STATUS.IN_PROGRESS as RoomStatusType;
    }

    // Update Redis
    await this.redis.set(
      `room:${roomId}`,
      JSON.stringify(parsedRoom),
      this.ROOM_TTL,
    );

    // Persist to database
    try {
      await this.database.db.insert(roomPlayers).values({
        roomId,
        userId,
        status: PLAYER_STATUS.PLAYING,
        guessCount: 0,
      });

      if (parsedRoom.players.length === 2) {
        await this.database.db
          .update(rooms)
          .set({ status: ROOM_STATUS.IN_PROGRESS })
          .where(eq(rooms.id, roomId));
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to persist room join to DB: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return parsedRoom;
  }

  async getRoomState(roomId: string): Promise<RoomState | null> {
    const room = await this.redis.get(`room:${roomId}`);
    if (!room) {
      return null;
    }

    return JSON.parse(room) as RoomState;
  }

  async removePlayer(roomId: string, userId: string): Promise<void> {
    const room = await this.redis.get(`room:${roomId}`);

    if (!room) throw new WsException('Room not found');

    const parsedRoom = JSON.parse(room) as RoomState;

    const playerIndex = parsedRoom.players.findIndex(
      (player) => player.id === userId,
    );
    if (playerIndex === -1) {
      throw new WsException('User not found in room');
    }

    parsedRoom.players.splice(playerIndex, 1);

    if (parsedRoom.players.length === 0) {
      await this.redis.del(`room:${roomId}`);

      // Mark room as finished in DB when everyone leaves
      try {
        await this.database.db
          .update(rooms)
          .set({ status: ROOM_STATUS.FINISHED })
          .where(eq(rooms.id, roomId));
      } catch (error: unknown) {
        this.logger.error(
          `Failed to persist room deletion to DB: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      return;
    }

    // If host left, assign new host
    if (parsedRoom.hostId === userId && parsedRoom.players.length > 0) {
      parsedRoom.hostId = parsedRoom.players[0].id;
    }

    // Update Redis
    await this.redis.set(
      `room:${roomId}`,
      JSON.stringify(parsedRoom),
      this.ROOM_TTL,
    );

    // Update DB: update host if needed
    try {
      if (parsedRoom.hostId !== userId) {
        // Host changed
        await this.database.db
          .update(rooms)
          .set({ hostId: parsedRoom.hostId })
          .where(eq(rooms.id, roomId));
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to persist player removal to DB: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Called when a multiplayer game ends — updates the room and each player's
   * final status and guess count in the database.
   */
  async finalizeRoom(roomId: string, parsedRoom: RoomState): Promise<void> {
    // Update Redis
    await this.redis.set(
      `room:${roomId}`,
      JSON.stringify(parsedRoom),
      this.ROOM_TTL,
    );

    // Persist final state to DB
    try {
      await this.database.db
        .update(rooms)
        .set({ status: parsedRoom.status })
        .where(eq(rooms.id, roomId));

      for (const player of parsedRoom.players) {
        await this.database.db
          .update(roomPlayers)
          .set({
            status: player.status,
            guessCount: player.guesses,
          })
          .where(
            and(
              eq(roomPlayers.roomId, roomId),
              eq(roomPlayers.userId, player.id),
            ),
          );
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to persist room finalization to DB: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
