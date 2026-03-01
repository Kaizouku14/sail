import type { JwtPayload } from '@/common/types/jwt-payload.type';
import type {
  AuthenticatedSocket,
  SocketData,
} from '@/common/types/socket-data.type';
import { RedisService } from '@/redis/redis.service';
import { Inject, forwardRef, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { type Namespace, Server } from 'socket.io';
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
// GameEvent type is used when multi-server Redis re-broadcast is enabled
// import type { GameEvent } from '@/common/types/game-event.type';

@WebSocketGateway({
  cors: {
    origin: process.env.BASE_URL,
  },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private get ns(): Namespace {
    // If `this.server` is already the namespace (has a `name` property
    // equal to '/game'), return it directly.  Otherwise resolve it from
    // the root server.
    const s = this.server as unknown as Namespace;
    if (s.name === '/game') return s;
    return this.server.of('/game');
  }

  private readonly logger = new Logger(GameGateway.name);

  private roomTimers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => RoomService))
    private readonly room: RoomService,
    private readonly game: GameService,
    private readonly word: WordService,
  ) {}

  async onModuleInit(): Promise<void> {
    const injectedName = (this.server as unknown as Namespace)?.name;
    this.logger.log(
      `[onModuleInit] this.server.name = "${injectedName}" | this.ns.name = "${this.ns.name}"`,
    );

    await this.redis.subscribe('game-events', (message: string) => {
      // Multi-server: uncomment the lines below to re-broadcast.
      // const event = JSON.parse(message) as GameEvent;
      // this.ns.to(event.roomId).emit(event.type, event.payload);
      void message; // suppress unused-variable lint
    });
  }

  private getSocketData(client: AuthenticatedSocket): SocketData {
    return client.data;
  }

  private async publishEvent(
    roomId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // Log how many sockets are currently in this room
    const socketsInRoom = await this.ns.in(roomId).fetchSockets();
    this.logger.log(
      `[emit] ${type} -> ns=${this.ns.name} room=${roomId} | sockets in room: ${socketsInRoom.length} [${socketsInRoom.map((s) => s.id).join(', ')}]`,
    );

    this.ns.to(roomId).emit(type, payload);

    try {
      await this.redis.publish(
        'game-events',
        JSON.stringify({ roomId, type, payload }),
      );
    } catch (err) {
      this.logger.warn(`[redis-pub] failed for ${type}: ${err}`);
    }
  }

  private startRoomTimer(roomId: string, durationSeconds: number): void {
    this.clearRoomTimer(roomId);

    const endTime = Date.now() + durationSeconds * 1000;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

      // Emit a tick every 5 seconds to reduce noise, plus the final 10 seconds every second
      if (remaining % 5 === 0 || remaining <= 10) {
        void this.publishEvent(roomId, 'TIMER_TICK', {
          remainingSeconds: remaining,
        });
      }

      if (remaining <= 0) {
        this.clearRoomTimer(roomId);
        void this.handleTimeUp(roomId);
      }
    }, 1000);

    this.roomTimers.set(roomId, interval);
  }

  private clearRoomTimer(roomId: string): void {
    const existing = this.roomTimers.get(roomId);
    if (existing) {
      clearInterval(existing);
      this.roomTimers.delete(roomId);
    }
  }

  private async handleTimeUp(roomId: string): Promise<void> {
    try {
      const room = await this.room.expireRoom(roomId);
      if (!room) return;

      await this.publishEvent(roomId, 'TIME_UP', {
        answer: room.word,
      });

      await this.publishEvent(roomId, 'GAME_OVER', {
        answer: room.word,
        reason: 'TIME_UP',
      });
    } catch (error: unknown) {
      this.logger.error(
        `Timer expiry error for room ${roomId}: ${getErrorMessage(error)}`,
      );
    }
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

      const data = this.getSocketData(client);
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
      const data = this.getSocketData(client);
      const user: JwtPayload | undefined = data.user;
      const roomId: string | undefined = data.roomId;

      if (!user || !roomId) return;

      // Don't remove from room immediately — allow reconnection.
      // Only publish a PLAYER_LEFT event so the opponent sees it.
      await this.publishEvent(roomId, 'PLAYER_LEFT', { playerId: user.id });

      await this.redis.del(`socket:${user.id}`);
    } catch {
      // player wasn't in a room — ignore
    }
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(client: AuthenticatedSocket) {
    try {
      const data = this.getSocketData(client);
      const user: JwtPayload = data.user;

      const room = await this.room.createRoom(user.id, user.username);

      await client.join(room.id);
      data.roomId = room.id;

      // Verify the host socket actually joined the Socket.IO room
      const socketsInRoom = await this.ns.in(room.id).fetchSockets();
      this.logger.log(
        `[createRoom] user=${user.id} (socket=${client.id}) created room ${room.id} | ns=${this.ns.name} sockets in room after join: ${socketsInRoom.length} [${socketsInRoom.map((s) => s.id).join(', ')}]`,
      );
      const clientRooms = Array.from(client.rooms ?? []);
      this.logger.log(
        `[createRoom] client.rooms = [${clientRooms.join(', ')}]`,
      );

      const publicState = this.room.getPublicRoomState(room);
      return { data: publicState };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      client.emit('ERROR', { message });
      return { data: null, error: message };
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: AuthenticatedSocket, payload: JoinRoomDto) {
    try {
      const data = this.getSocketData(client);
      const user: JwtPayload = data.user;

      this.logger.log(
        `[joinRoom] user=${user.id} (socket=${client.id}) joining room ${payload.roomId}`,
      );

      const room = await this.room.joinRoom(
        payload.roomId,
        user.id,
        user.username,
      );

      await client.join(payload.roomId);
      data.roomId = payload.roomId;

      // Verify room membership before emitting events
      const socketsInRoom = await this.ns.in(payload.roomId).fetchSockets();
      this.logger.log(
        `[joinRoom] ns=${this.ns.name} sockets in room ${payload.roomId} after join: ${socketsInRoom.length} [${socketsInRoom.map((s) => s.id).join(', ')}]`,
      );

      await this.publishEvent(payload.roomId, 'PLAYER_JOINED', {
        playerId: user.id,
        username: user.username,
        roomStatus: room.status,
        startedAt: room.startedAt
          ? new Date(room.startedAt).toISOString()
          : null,
        remainingSeconds:
          room.status === ROOM_STATUS.IN_PROGRESS
            ? this.room.getRemainingSeconds(room)
            : null,
        timeLimit: room.timeLimit,
      });

      // If the room just became IN_PROGRESS (2 players), start the timer
      if (room.status === ROOM_STATUS.IN_PROGRESS && room.startedAt) {
        const remaining = this.room.getRemainingSeconds(room);
        if (
          remaining !== null &&
          remaining > 0 &&
          !this.roomTimers.has(room.id)
        ) {
          this.startRoomTimer(room.id, remaining);

          // Broadcast TIMER_START so clients know the match duration
          await this.publishEvent(room.id, 'TIMER_START', {
            remainingSeconds: remaining,
            timeLimit: room.timeLimit,
          });
        }
      }

      const publicState = this.room.getPublicRoomState(room);
      return { data: publicState };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      client.emit('ERROR', { message });
      return { data: null, error: message };
    }
  }

  @SubscribeMessage('rejoinRoom')
  async handleRejoinRoom(
    client: AuthenticatedSocket,
    payload?: { roomId?: string },
  ) {
    try {
      const data = this.getSocketData(client);
      const user: JwtPayload = data.user;

      // If roomId is specified, use that. Otherwise look up the user's active room.
      const room = payload?.roomId
        ? await this.room.getRoomState(payload.roomId)
        : await this.room.getUserActiveRoom(user.id);

      if (!room) {
        client.emit('ERROR', { message: 'No active room found' });
        return { data: null, error: 'No active room found' };
      }

      // Verify user is actually in this room
      const isInRoom = room.players.some((p) => p.id === user.id);
      if (!isInRoom) {
        client.emit('ERROR', { message: 'You are not in this room' });
        return { data: null, error: 'You are not in this room' };
      }

      await client.join(room.id);
      data.roomId = room.id;
      await this.redis.set(`socket:${user.id}`, client.id, 60 * 60 * 24);

      await this.publishEvent(room.id, 'PLAYER_REJOINED', {
        playerId: user.id,
        username: user.username,
      });

      // If the room is IN_PROGRESS but the server-side timer was lost
      // (e.g. server restart), restart it so the game doesn't hang.
      if (
        room.status === ROOM_STATUS.IN_PROGRESS &&
        room.startedAt &&
        !this.roomTimers.has(room.id)
      ) {
        const remaining = this.room.getRemainingSeconds(room);
        if (remaining !== null && remaining > 0) {
          this.startRoomTimer(room.id, remaining);

          await this.publishEvent(room.id, 'TIMER_START', {
            remainingSeconds: remaining,
            timeLimit: room.timeLimit,
          });
        } else if (remaining !== null && remaining <= 0) {
          // Time already expired while no timer was running — finalize now
          await this.handleTimeUp(room.id);
        }
      }

      const publicState = this.room.getPublicRoomState(room);
      return { data: publicState };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      client.emit('ERROR', { message });
      return { data: null, error: message };
    }
  }

  @SubscribeMessage('submitGuess')
  async handleSubmitGuess(
    client: AuthenticatedSocket,
    payload: SubmitGuessDto,
  ) {
    try {
      const data = this.getSocketData(client);
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

      // Check if time is already up
      if (this.room.isTimeUp(room)) {
        await this.handleTimeUp(roomId);
        client.emit('ERROR', { message: 'Time is up' });
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

      // Reject duplicate guesses
      const normalizedWord = payload.word.toLowerCase();
      if (player.guessWords && player.guessWords.includes(normalizedWord)) {
        client.emit('ERROR', { message: 'Already guessed this word' });
        return;
      }

      const results = this.game.evaluateWord(normalizedWord, room.word);

      player.guesses += 1;
      player.guessColors = player.guessColors ?? [];
      player.guessColors.push(results.map((r) => r));
      player.guessWords = player.guessWords ?? [];
      player.guessWords.push(normalizedWord);

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
        this.clearRoomTimer(roomId);
        await this.room.finalizeRoom(roomId, room);
      } else {
        await this.redis.set(
          `room:${roomId}`,
          JSON.stringify(room),
          60 * 60 * 24,
        );
      }

      await this.publishEvent(roomId, 'GUESS_RESULT', {
        playerId: user.id,
        guessNumber: player.guesses,
        word: normalizedWord,
        results,
        status: player.status,
        answer: player.status !== PLAYER_STATUS.PLAYING ? room.word : undefined,
      });

      await this.publishEvent(roomId, 'OPPONENT_GUESS', {
        playerId: user.id,
        guessNumber: player.guesses,
        colors: results.map((r) => r),
        status: player.status,
      });

      if (isWon) {
        await this.publishEvent(roomId, 'PLAYER_WON', {
          playerId: user.id,
          guessCount: player.guesses,
        });
      } else if (player.status === PLAYER_STATUS.LOST) {
        await this.publishEvent(roomId, 'PLAYER_LOST', {
          playerId: user.id,
          answer: room.word,
        });
      }

      if (allFinished) {
        await this.publishEvent(roomId, 'GAME_OVER', {
          answer: room.word,
          reason: 'ALL_FINISHED',
        });
      }
    } catch (error: unknown) {
      client.emit('ERROR', { message: getErrorMessage(error) });
    }
  }

  @SubscribeMessage('requestRematch')
  async handleRequestRematch(
    client: AuthenticatedSocket,
    payload: { roomId: string },
  ) {
    try {
      const data = this.getSocketData(client);
      const user: JwtPayload = data.user;

      const newRoom = await this.room.createRematch(
        payload.roomId,
        user.id,
        user.username,
      );

      // Join the new room immediately
      await client.join(newRoom.id);
      data.roomId = newRoom.id;

      // Notify everyone in the old room about the rematch offer
      await this.publishEvent(payload.roomId, 'REMATCH_OFFER', {
        newRoomId: newRoom.id,
        fromPlayerId: user.id,
        fromUsername: user.username,
      });

      const publicState = this.room.getPublicRoomState(newRoom);
      return { data: publicState };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      client.emit('ERROR', { message });
      return { data: null, error: message };
    }
  }

  @SubscribeMessage('acceptRematch')
  async handleAcceptRematch(
    client: AuthenticatedSocket,
    payload: { previousRoomId: string },
  ) {
    try {
      const data = this.getSocketData(client);
      const user: JwtPayload = data.user;

      const newRoomId = await this.room.getRematchRoom(payload.previousRoomId);
      if (!newRoomId) {
        client.emit('ERROR', { message: 'Rematch room not found or expired' });
        return { data: null, error: 'Rematch room not found or expired' };
      }

      const room = await this.room.joinRoom(newRoomId, user.id, user.username);

      await client.join(newRoomId);
      data.roomId = newRoomId;

      await this.publishEvent(newRoomId, 'PLAYER_JOINED', {
        playerId: user.id,
        username: user.username,
        roomStatus: room.status,
        startedAt: room.startedAt
          ? new Date(room.startedAt).toISOString()
          : null,
        remainingSeconds:
          room.status === ROOM_STATUS.IN_PROGRESS
            ? this.room.getRemainingSeconds(room)
            : null,
        timeLimit: room.timeLimit,
      });

      await this.publishEvent(payload.previousRoomId, 'REMATCH_ACCEPTED', {
        newRoomId,
      });

      // Start the timer if the room is now IN_PROGRESS
      if (room.status === ROOM_STATUS.IN_PROGRESS && room.startedAt) {
        const remaining = this.room.getRemainingSeconds(room);
        if (
          remaining !== null &&
          remaining > 0 &&
          !this.roomTimers.has(room.id)
        ) {
          this.startRoomTimer(room.id, remaining);

          await this.publishEvent(room.id, 'TIMER_START', {
            remainingSeconds: remaining,
            timeLimit: room.timeLimit,
          });
        }
      }

      const publicState = this.room.getPublicRoomState(room);
      return { data: publicState };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      client.emit('ERROR', { message });
      return { data: null, error: message };
    }
  }
}
