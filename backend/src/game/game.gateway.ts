import type { JwtPayload } from '@/common/types/jwt-payload.type';
import type {
  AuthenticatedSocket,
  SocketData,
} from '@/common/types/socket-data.type';
import { RedisService } from '@/redis/redis.service';
import { Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JoinRoomDto } from './dto/join-room.dto';
import { RoomService } from '@/room/room.service';
import { GameService } from './game.service';
import { WordService } from '@/word/word.service';
import { PLAYER_STATUS } from '@/common/constants/player-status.constants';
import {
  PlayerStatusType,
  RoomStatusType,
} from '@/common/types/room-state.type';
import { LETTER_RESULT } from '@/common/constants/word.constants';
import { ROOM_STATUS } from '@/common/constants/room-status.constants';
import { SubmitGuessDto } from './dto/submit-guess.dto';
import { getErrorMessage } from '@/common/utils/error.utils';
import { GameEvent } from '@/common/types/game-event.type';

function getSocketData(client: AuthenticatedSocket): SocketData {
  return client.data;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => RoomService))
    private readonly room: RoomService,
    private readonly game: GameService,
    private readonly word: WordService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.redis.subscribe('game-events', (message: string) => {
      const event = JSON.parse(message) as GameEvent;
      this.server.to(event.roomId).emit(event.type, event.payload);
    });
  }

  private async publishEvent(
    roomId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.redis.publish(
      'game-events',
      JSON.stringify({ roomId, type, payload }),
    );
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = client.handshake.auth?.token as string;

      if (!token) {
        client.emit('ERROR', { message: 'Missing token' });
        client.disconnect();
        return;
      }

      const [type, value] = token.split(' ');
      if (type !== 'Bearer' || !value) {
        client.emit('ERROR', { message: 'Invalid token format' });
        client.disconnect();
        return;
      }

      const payload = await this.jwt.verifyAsync<JwtPayload>(value);

      const data = getSocketData(client);
      data.user = payload;

      await this.redis.set(`socket:${payload.id}`, client.id, 60 * 60 * 24);

      client.emit('CONNECTED', {
        message: 'Connected successfully',
        userId: payload.id,
      });
    } catch {
      client.emit('ERROR', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    try {
      const data = getSocketData(client);
      const user: JwtPayload | undefined = data.user;
      const roomId: string | undefined = data.roomId;

      if (!user || !roomId) return;

      await this.room.removePlayer(roomId, user.id);

      await this.publishEvent(roomId, 'PLAYER_LEFT', { playerId: user.id });

      await this.redis.del(`socket:${user.id}`);
    } catch {
      // player wasn't in a room — ignore
    }
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(client: AuthenticatedSocket) {
    try {
      const data = getSocketData(client);
      const user: JwtPayload = data.user;

      const room = await this.room.createRoom(user.id, user.username);

      await client.join(room.id);

      data.roomId = room.id;

      return { event: 'ROOM_CREATED', data: room };
    } catch (error: unknown) {
      client.emit('ERROR', { message: getErrorMessage(error) });
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: AuthenticatedSocket, payload: JoinRoomDto) {
    try {
      const data = getSocketData(client);
      const user: JwtPayload = data.user;

      const room = await this.room.joinRoom(
        payload.roomId,
        user.id,
        user.username,
      );

      await client.join(payload.roomId);

      data.roomId = payload.roomId;

      await this.publishEvent(payload.roomId, 'PLAYER_JOINED', {
        playerId: user.id,
        username: user.username,
      });

      return { event: 'ROOM_STATE', data: room };
    } catch (error: unknown) {
      client.emit('ERROR', { message: getErrorMessage(error) });
    }
  }

  @SubscribeMessage('submitGuess')
  async handleSubmitGuess(
    client: AuthenticatedSocket,
    payload: SubmitGuessDto,
  ) {
    try {
      const data = getSocketData(client);
      const user: JwtPayload = data.user;
      const roomId: string | undefined = data.roomId;

      if (!roomId) {
        client.emit('ERROR', { message: 'Not in a room' });
        return;
      }

      const room = await this.room.getRoomState(roomId);
      if (!room) {
        client.emit('ERROR', { message: 'Room not found' });
        return;
      }

      const player = room.players.find((p) => p.id === user.id);
      if (!player) {
        client.emit('ERROR', { message: 'Player not in room' });
        return;
      }

      if (player.status !== PLAYER_STATUS.PLAYING) {
        client.emit('ERROR', {
          message: 'Game already finished for this player',
        });
        return;
      }

      if (!this.word.isValid(payload.word)) {
        client.emit('ERROR', { message: 'Invalid word' });
        return;
      }

      const results = this.game.evaluateWord(
        payload.word.toLowerCase(),
        room.word,
      );

      player.guesses += 1;

      const isWon = results.every((r) => r === LETTER_RESULT.CORRECT);
      if (isWon) {
        player.status = PLAYER_STATUS.WON as PlayerStatusType;
      } else if (player.guesses >= 6) {
        player.status = PLAYER_STATUS.LOST as PlayerStatusType;
      }

      const allFinished = room.players.every(
        (p) => p.status !== PLAYER_STATUS.PLAYING,
      );
      if (allFinished) {
        room.status = ROOM_STATUS.FINISHED as RoomStatusType;
      }

      if (allFinished) {
        // Persist final state to both Redis and database
        await this.room.finalizeRoom(roomId, room);
      } else {
        // Just update Redis for in-progress state
        await this.redis.set(
          `room:${roomId}`,
          JSON.stringify(room),
          60 * 60 * 24,
        );
      }

      await this.publishEvent(roomId, 'GUESS_RESULT', {
        playerId: user.id,
        guessNumber: player.guesses,
        results,
      });

      if (isWon) {
        await this.publishEvent(roomId, 'PLAYER_WON', {
          playerId: user.id,
          guessCount: player.guesses,
        });
      }

      if (allFinished) {
        await this.publishEvent(roomId, 'GAME_OVER', { answer: room.word });
      }
    } catch (error: unknown) {
      client.emit('ERROR', { message: getErrorMessage(error) });
    }
  }
}
