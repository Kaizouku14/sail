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
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_TIME_LIMIT = 360; // 6 minutes in seconds

export interface PublicRoomState {
  id: string;
  hostId: string;
  status: RoomStatusType;
  players: {
    id: string;
    username: string;
    guesses: number;
    status: PlayerStatusType;
    guessColors: string[][];
  }[];
  startedAt: string | null;
  finishedAt: string | null;
  timeLimit: number;
  remainingSeconds: number | null;
}

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
      startedAt: null,
      finishedAt: null,
      timeLimit: DEFAULT_TIME_LIMIT,
      players: [
        {
          id: userId,
          username,
          guesses: 0,
          status: PLAYER_STATUS.PLAYING as PlayerStatusType,
          socketId: '',
          guessColors: [],
        },
      ],
    };

    await this.redis.set(`room:${roomId}`, JSON.stringify(room), this.ROOM_TTL);

    // Track which room this user is in for reconnection
    await this.redis.set(`user-room:${userId}`, roomId, this.ROOM_TTL);

    try {
      await this.database.db.insert(rooms).values({
        id: roomId,
        hostId: userId,
        word,
        status: ROOM_STATUS.WAITING,
        timeLimit: DEFAULT_TIME_LIMIT,
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
      // Allow reconnection if player is already in the room
      if (parsedRoom.players.some((player) => player.id === userId)) {
        await this.redis.set(`user-room:${userId}`, roomId, this.ROOM_TTL);
        return parsedRoom;
      }
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
      guessColors: [],
    });

    if (parsedRoom.players.length === 2) {
      parsedRoom.status = ROOM_STATUS.IN_PROGRESS as RoomStatusType;
      parsedRoom.startedAt = new Date();
    }

    await this.redis.set(
      `room:${roomId}`,
      JSON.stringify(parsedRoom),
      this.ROOM_TTL,
    );

    // Track which room this user is in for reconnection
    await this.redis.set(`user-room:${userId}`, roomId, this.ROOM_TTL);

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
          .set({
            status: ROOM_STATUS.IN_PROGRESS,
            startedAt: parsedRoom.startedAt,
          })
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

  getPublicRoomState(room: RoomState): PublicRoomState {
    const remainingSeconds = this.getRemainingSeconds(room);

    return {
      id: room.id,
      hostId: room.hostId,
      status: room.status,
      players: room.players.map((p) => ({
        id: p.id,
        username: p.username,
        guesses: p.guesses,
        status: p.status,
        guessColors: p.guessColors,
      })),
      startedAt: room.startedAt ? new Date(room.startedAt).toISOString() : null,
      finishedAt: room.finishedAt
        ? new Date(room.finishedAt).toISOString()
        : null,
      timeLimit: room.timeLimit,
      remainingSeconds,
    };
  }

  getRemainingSeconds(room: RoomState): number | null {
    if (room.status !== ROOM_STATUS.IN_PROGRESS || !room.startedAt) {
      return null;
    }

    const startedAt = new Date(room.startedAt).getTime();
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const remaining = room.timeLimit - elapsed;

    return Math.max(0, remaining);
  }

  isTimeUp(room: RoomState): boolean {
    const remaining = this.getRemainingSeconds(room);
    return remaining !== null && remaining <= 0;
  }

  async getUserActiveRoom(userId: string): Promise<RoomState | null> {
    const roomId = await this.redis.get(`user-room:${userId}`);
    if (!roomId) return null;

    const room = await this.getRoomState(roomId);
    if (!room) {
      await this.redis.del(`user-room:${userId}`);
      return null;
    }

    const isInRoom = room.players.some((p) => p.id === userId);
    if (!isInRoom || room.status === ROOM_STATUS.FINISHED) {
      await this.redis.del(`user-room:${userId}`);
      return null;
    }

    return room;
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

    // Clean up user-room mapping
    await this.redis.del(`user-room:${userId}`);

    if (parsedRoom.players.length === 0) {
      await this.redis.del(`room:${roomId}`);

      try {
        await this.database.db
          .update(rooms)
          .set({ status: ROOM_STATUS.FINISHED, finishedAt: new Date() })
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

    await this.redis.set(
      `room:${roomId}`,
      JSON.stringify(parsedRoom),
      this.ROOM_TTL,
    );

    try {
      if (parsedRoom.hostId !== userId) {
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

  async finalizeRoom(roomId: string, parsedRoom: RoomState): Promise<void> {
    parsedRoom.status = ROOM_STATUS.FINISHED as RoomStatusType;
    parsedRoom.finishedAt = new Date();

    await this.redis.set(
      `room:${roomId}`,
      JSON.stringify(parsedRoom),
      this.ROOM_TTL,
    );

    // Clean up user-room mappings
    for (const player of parsedRoom.players) {
      await this.redis.del(`user-room:${player.id}`);
    }

    // Determine winner for DB persistence
    const winner = this.determineWinner(parsedRoom);

    try {
      await this.database.db
        .update(rooms)
        .set({
          status: parsedRoom.status,
          finishedAt: parsedRoom.finishedAt,
          winnerId: winner?.id ?? null,
        })
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

  async expireRoom(roomId: string): Promise<RoomState | null> {
    const room = await this.getRoomState(roomId);
    if (!room || room.status !== ROOM_STATUS.IN_PROGRESS) return null;

    for (const player of room.players) {
      if (player.status === PLAYER_STATUS.PLAYING) {
        player.status = PLAYER_STATUS.LOST as PlayerStatusType;
      }
    }

    await this.finalizeRoom(roomId, room);
    return room;
  }

  private determineWinner(room: RoomState) {
    const winners = room.players.filter((p) => p.status === PLAYER_STATUS.WON);

    if (winners.length === 0) return null;
    if (winners.length === 1) return winners[0];

    // Both won — fewest guesses wins
    return winners.sort((a, b) => a.guesses - b.guesses)[0];
  }

  async createRematch(
    previousRoomId: string,
    userId: string,
    username: string,
  ): Promise<RoomState> {
    const previousRoom = await this.getRoomState(previousRoomId);
    if (!previousRoom) throw new WsException('Previous room not found');

    if (previousRoom.status !== ROOM_STATUS.FINISHED) {
      throw new WsException('Previous room has not finished yet');
    }

    const isPlayer = previousRoom.players.some((p) => p.id === userId);
    if (!isPlayer) {
      throw new WsException('You were not in this room');
    }

    const room = await this.createRoom(userId, username);

    // Store rematch link so opponent can find it
    await this.redis.set(
      `rematch:${previousRoomId}`,
      room.id,
      60 * 60, // 1 hour TTL
    );

    return room;
  }

  async getRematchRoom(previousRoomId: string): Promise<string | null> {
    return this.redis.get(`rematch:${previousRoomId}`);
  }

  async getRaceHistory(
    userId: string,
    limit = 20,
  ): Promise<
    {
      roomId: string;
      status: string;
      guessCount: number;
      joinedAt: Date;
      roomStatus: string;
      hostId: string;
      word: string;
      createdAt: Date;
      finishedAt: Date | null;
    }[]
  > {
    try {
      const results = await this.database.db
        .select({
          roomId: roomPlayers.roomId,
          status: roomPlayers.status,
          guessCount: roomPlayers.guessCount,
          joinedAt: roomPlayers.joinedAt,
          roomStatus: rooms.status,
          hostId: rooms.hostId,
          word: rooms.word,
          createdAt: rooms.createdAt,
          finishedAt: rooms.finishedAt,
        })
        .from(roomPlayers)
        .innerJoin(rooms, eq(roomPlayers.roomId, rooms.id))
        .where(eq(roomPlayers.userId, userId))
        .orderBy(desc(roomPlayers.joinedAt))
        .limit(limit);

      return results;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch race history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  async getRaceStats(userId: string): Promise<{
    totalRaces: number;
    wins: number;
    losses: number;
    winRate: number;
  }> {
    const history = await this.getRaceHistory(userId, 1000);

    // Only count finished rooms
    const finished = history.filter(
      (h) => h.roomStatus === ROOM_STATUS.FINISHED,
    );

    const wins = finished.filter((h) => h.status === PLAYER_STATUS.WON).length;
    const losses = finished.filter(
      (h) => h.status === PLAYER_STATUS.LOST,
    ).length;
    const totalRaces = finished.length;

    return {
      totalRaces,
      wins,
      losses,
      winRate: totalRaces === 0 ? 0 : Math.round((wins / totalRaces) * 100),
    };
  }
}
