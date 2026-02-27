import { PLAYER_STATUS } from '@/common/constants/player-status.constants';
import { ROOM_STATUS } from '@/common/constants/room-status.constants';
import { PlayerStatusType, RoomState } from '@/common/types/room-state.type';
import { GameService } from '@/game/game.service';
import { RedisService } from '@/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RoomService {
  constructor(
    private readonly game: GameService,
    private readonly redis: RedisService,
  ) {}

  async createRoom(userId: string, username: string): Promise<RoomState> {
    const word = this.game.getDailyWord();
    const room = {
      id: uuidv4(),
      hostId: userId,
      word,
      status: ROOM_STATUS.WAITING,
      createdAt: new Date(),
      players: [
        {
          id: userId,
          username,
          guesses: 0,
          status: PLAYER_STATUS.PLAYING,
          socketId: '', // you'll update this when socket connects
        },
      ],
    } as RoomState;

    await this.redis.set(`room:${room.id}`, JSON.stringify(room), 60 * 60 * 24);
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

    await this.redis.set(
      `room:${roomId}`,
      JSON.stringify(parsedRoom),
      60 * 60 * 24,
    );

    return parsedRoom;
  }

  async getRoomState(roomId: string): Promise<RoomState | null> {
    const room = await this.redis.get(`room:${roomId}`);
    if (!room) {
      return null;
    }

    return JSON.parse(room) as RoomState;
  }

  async removePlayer(roomId: string, userId: string) {
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
      return;
    }

    // if host left, assign new host
    if (parsedRoom.hostId === userId && parsedRoom.players.length > 0) {
      parsedRoom.hostId = parsedRoom.players[0].id;
    }

    await this.redis.set(
      `room:${roomId}`,
      JSON.stringify(parsedRoom),
      60 * 60 * 24,
    );
  }
}
