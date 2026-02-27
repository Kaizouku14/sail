/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

import { GameGateway } from './game.gateway';
import { RedisService } from '@/redis/redis.service';
import { RoomService } from '@/room/room.service';
import { GameService } from './game.service';
import { WordService } from '@/word/word.service';
import { PLAYER_STATUS } from '@/common/constants/player-status.constants';
import { ROOM_STATUS } from '@/common/constants/room-status.constants';
import { LETTER_RESULT } from '@/common/constants/word.constants';
import type { AuthenticatedSocket } from '@/common/types/socket-data.type';
import type { RoomState } from '@/common/types/room-state.type';
import type { JwtPayload } from '@/common/types/jwt-payload.type';
import type { Server } from 'socket.io';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<RedisService>;
  let roomService: jest.Mocked<RoomService>;
  let gameService: jest.Mocked<GameService>;
  let wordService: jest.Mocked<WordService>;

  const mockUser: JwtPayload = {
    id: 'user-1',
    username: 'alice',
    email: 'alice@example.com',
  };

  const mockUser2: JwtPayload = {
    id: 'user-2',
    username: 'bob',
    email: 'bob@example.com',
  };

  const mockServer = () => {
    const emitFn = jest.fn();
    return {
      to: jest.fn().mockReturnValue({ emit: emitFn }),
      emit: emitFn,
      __emit: emitFn,
    };
  };

  const createMockSocket = (
    overrides: {
      token?: string;
      user?: JwtPayload;
      roomId?: string;
    } = {},
  ): AuthenticatedSocket => {
    const { token = 'Bearer valid-token', user, roomId } = overrides;

    const data: Record<string, unknown> = {};
    if (user) data.user = user;
    if (roomId) data.roomId = roomId;

    return {
      id: 'socket-1',
      handshake: {
        auth: { token },
      },
      data,
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthenticatedSocket;
  };

  const createMockRoom = (overrides: Partial<RoomState> = {}): RoomState => ({
    id: 'room-1',
    word: 'crane',
    hostId: 'user-1',
    status: ROOM_STATUS.IN_PROGRESS,
    createdAt: new Date(),
    players: [
      {
        id: 'user-1',
        username: 'alice',
        guesses: 0,
        status: PLAYER_STATUS.PLAYING,
        socketId: 'socket-1',
      },
      {
        id: 'user-2',
        username: 'bob',
        guesses: 0,
        status: PLAYER_STATUS.PLAYING,
        socketId: 'socket-2',
      },
    ],
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            publish: jest.fn().mockResolvedValue(undefined),
            subscribe: jest.fn().mockResolvedValue(undefined),
            zadd: jest.fn(),
            zremrangebyscore: jest.fn(),
            zcard: jest.fn(),
            expire: jest.fn(),
          },
        },
        {
          provide: RoomService,
          useValue: {
            createRoom: jest.fn(),
            joinRoom: jest.fn(),
            getRoomState: jest.fn(),
            removePlayer: jest.fn(),
            finalizeRoom: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: GameService,
          useValue: {
            evaluateWord: jest.fn(),
          },
        },
        {
          provide: WordService,
          useValue: {
            isValid: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
    roomService = module.get(RoomService) as jest.Mocked<RoomService>;
    gameService = module.get(GameService) as jest.Mocked<GameService>;
    wordService = module.get(WordService) as jest.Mocked<WordService>;

    const server = mockServer();
    gateway.server = server as unknown as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // onModuleInit — Redis pub/sub subscription
  // ---------------------------------------------------------------------------
  describe('onModuleInit', () => {
    it('should subscribe to the "game-events" channel', async () => {
      await gateway.onModuleInit();

      expect(redisService.subscribe).toHaveBeenCalledWith(
        'game-events',
        expect.any(Function),
      );
    });

    it('should emit events to the correct room when a message is received', async () => {
      let subscribedCallback: ((message: string) => void) | undefined;

      redisService.subscribe.mockImplementation(
        async (_channel: string, cb: (message: string) => void) => {
          subscribedCallback = cb;
        },
      );

      await gateway.onModuleInit();
      expect(subscribedCallback).toBeDefined();

      const event = {
        roomId: 'room-1',
        type: 'PLAYER_JOINED',
        payload: { playerId: 'user-1', username: 'alice' },
      };

      subscribedCallback!(JSON.stringify(event));

      const server = gateway.server as unknown as ReturnType<typeof mockServer>;
      expect(server.to).toHaveBeenCalledWith('room-1');
      expect(server.__emit).toHaveBeenCalledWith('PLAYER_JOINED', {
        playerId: 'user-1',
        username: 'alice',
      });
    });

    it('should handle different event types correctly', async () => {
      let subscribedCallback: ((message: string) => void) | undefined;

      redisService.subscribe.mockImplementation(
        async (_channel: string, cb: (message: string) => void) => {
          subscribedCallback = cb;
        },
      );

      await gateway.onModuleInit();

      const event = {
        roomId: 'room-42',
        type: 'GAME_OVER',
        payload: { answer: 'crane' },
      };

      subscribedCallback!(JSON.stringify(event));

      const server = gateway.server as unknown as ReturnType<typeof mockServer>;
      expect(server.to).toHaveBeenCalledWith('room-42');
      expect(server.__emit).toHaveBeenCalledWith('GAME_OVER', {
        answer: 'crane',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // handleConnection
  // ---------------------------------------------------------------------------
  describe('handleConnection', () => {
    it('should disconnect the client when no token is provided', async () => {
      const client = createMockSocket({ token: '' });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Missing token',
      });
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect the client when token format is invalid (no space)', async () => {
      const client = createMockSocket({ token: 'InvalidToken' });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Invalid token format',
      });
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect the client when token type is not Bearer', async () => {
      const client = createMockSocket({ token: 'Basic some-token' });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Invalid token format',
      });
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect when Bearer is present but value is empty', async () => {
      const client = createMockSocket({ token: 'Bearer ' });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Invalid token format',
      });
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect the client when JWT verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      const client = createMockSocket({ token: 'Bearer expired-token' });

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Invalid or expired token',
      });
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should authenticate and store user data on the socket', async () => {
      jwtService.verifyAsync.mockResolvedValue(mockUser);

      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.data.user).toEqual(mockUser);
    });

    it('should store the socket mapping in Redis with 24h TTL', async () => {
      jwtService.verifyAsync.mockResolvedValue(mockUser);

      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(redisService.set).toHaveBeenCalledWith(
        `socket:${mockUser.id}`,
        client.id,
        60 * 60 * 24,
      );
    });

    it('should emit CONNECTED event with the user ID', async () => {
      jwtService.verifyAsync.mockResolvedValue(mockUser);

      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('CONNECTED', {
        message: 'Connected successfully',
        userId: mockUser.id,
      });
    });

    it('should verify the token value, not the full header', async () => {
      jwtService.verifyAsync.mockResolvedValue(mockUser);

      const client = createMockSocket({ token: 'Bearer my-jwt-token-123' });

      await gateway.handleConnection(client);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('my-jwt-token-123');
    });
  });

  // ---------------------------------------------------------------------------
  // handleDisconnect
  // ---------------------------------------------------------------------------
  describe('handleDisconnect', () => {
    it('should do nothing when user data is not set on socket', async () => {
      const client = createMockSocket();

      await gateway.handleDisconnect(client);

      expect(roomService.removePlayer).not.toHaveBeenCalled();
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it('should do nothing when roomId is not set on socket', async () => {
      const client = createMockSocket({ user: mockUser });

      await gateway.handleDisconnect(client);

      expect(roomService.removePlayer).not.toHaveBeenCalled();
    });

    it('should remove the player from the room', async () => {
      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleDisconnect(client);

      expect(roomService.removePlayer).toHaveBeenCalledWith(
        'room-1',
        mockUser.id,
      );
    });

    it('should publish a PLAYER_LEFT event via Redis pub/sub', async () => {
      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleDisconnect(client);

      expect(redisService.publish).toHaveBeenCalledWith(
        'game-events',
        JSON.stringify({
          roomId: 'room-1',
          type: 'PLAYER_LEFT',
          payload: { playerId: mockUser.id },
        }),
      );
    });

    it('should remove the socket mapping from Redis', async () => {
      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleDisconnect(client);

      expect(redisService.del).toHaveBeenCalledWith(`socket:${mockUser.id}`);
    });

    it('should silently catch errors (e.g. player was not in a room)', async () => {
      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      roomService.removePlayer.mockRejectedValue(
        new Error('User not found in room'),
      );

      await expect(gateway.handleDisconnect(client)).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // handleCreateRoom
  // ---------------------------------------------------------------------------
  describe('handleCreateRoom', () => {
    it('should create a room via RoomService', async () => {
      const room = createMockRoom({ players: [createMockRoom().players[0]] });
      roomService.createRoom.mockResolvedValue(room);

      const client = createMockSocket({ user: mockUser });

      await gateway.handleCreateRoom(client);

      expect(roomService.createRoom).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.username,
      );
    });

    it('should join the Socket.io room after creation', async () => {
      const room = createMockRoom();
      roomService.createRoom.mockResolvedValue(room);

      const client = createMockSocket({ user: mockUser });

      await gateway.handleCreateRoom(client);

      expect(client.join).toHaveBeenCalledWith(room.id);
    });

    it('should store the roomId in socket data', async () => {
      const room = createMockRoom();
      roomService.createRoom.mockResolvedValue(room);

      const client = createMockSocket({ user: mockUser });

      await gateway.handleCreateRoom(client);

      expect(client.data.roomId).toBe(room.id);
    });

    it('should return the ROOM_CREATED event with room data', async () => {
      const room = createMockRoom();
      roomService.createRoom.mockResolvedValue(room);

      const client = createMockSocket({ user: mockUser });

      const result = await gateway.handleCreateRoom(client);

      expect(result).toEqual({ event: 'ROOM_CREATED', data: room });
    });

    it('should emit ERROR when RoomService.createRoom throws', async () => {
      roomService.createRoom.mockRejectedValue(
        new Error('Failed to create room'),
      );

      const client = createMockSocket({ user: mockUser });

      await gateway.handleCreateRoom(client);

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Failed to create room',
      });
    });

    it('should emit a generic error message for non-Error throws', async () => {
      roomService.createRoom.mockRejectedValue('string-error');

      const client = createMockSocket({ user: mockUser });

      await gateway.handleCreateRoom(client);

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'An unexpected error occurred',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // handleJoinRoom
  // ---------------------------------------------------------------------------
  describe('handleJoinRoom', () => {
    it('should join the room via RoomService', async () => {
      const room = createMockRoom();
      roomService.joinRoom.mockResolvedValue(room);

      const client = createMockSocket({ user: mockUser });

      await gateway.handleJoinRoom(client, { roomId: 'room-1' });

      expect(roomService.joinRoom).toHaveBeenCalledWith(
        'room-1',
        mockUser.id,
        mockUser.username,
      );
    });

    it('should join the Socket.io room', async () => {
      const room = createMockRoom();
      roomService.joinRoom.mockResolvedValue(room);

      const client = createMockSocket({ user: mockUser });

      await gateway.handleJoinRoom(client, { roomId: 'room-1' });

      expect(client.join).toHaveBeenCalledWith('room-1');
    });

    it('should store the roomId in socket data', async () => {
      const room = createMockRoom();
      roomService.joinRoom.mockResolvedValue(room);

      const client = createMockSocket({ user: mockUser });

      await gateway.handleJoinRoom(client, { roomId: 'room-1' });

      expect(client.data.roomId).toBe('room-1');
    });

    it('should publish PLAYER_JOINED event via Redis pub/sub', async () => {
      const room = createMockRoom();
      roomService.joinRoom.mockResolvedValue(room);

      const client = createMockSocket({ user: mockUser });

      await gateway.handleJoinRoom(client, { roomId: 'room-1' });

      expect(redisService.publish).toHaveBeenCalledWith(
        'game-events',
        JSON.stringify({
          roomId: 'room-1',
          type: 'PLAYER_JOINED',
          payload: {
            playerId: mockUser.id,
            username: mockUser.username,
          },
        }),
      );
    });

    it('should return the room state to the joining player', async () => {
      const room = createMockRoom();
      roomService.joinRoom.mockResolvedValue(room);

      const client = createMockSocket({ user: mockUser });

      const result = await gateway.handleJoinRoom(client, {
        roomId: 'room-1',
      });

      expect(result).toEqual({ event: 'ROOM_STATE', data: room });
    });

    it('should emit ERROR when RoomService throws', async () => {
      roomService.joinRoom.mockRejectedValue(new Error('Room is full'));

      const client = createMockSocket({ user: mockUser });

      await gateway.handleJoinRoom(client, { roomId: 'room-1' });

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Room is full',
      });
    });

    it('should emit a generic error message for non-Error throws', async () => {
      roomService.joinRoom.mockRejectedValue('something went wrong');

      const client = createMockSocket({ user: mockUser });

      await gateway.handleJoinRoom(client, { roomId: 'room-1' });

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'An unexpected error occurred',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // handleSubmitGuess — validation
  // ---------------------------------------------------------------------------
  describe('handleSubmitGuess — validation', () => {
    it('should emit ERROR when the player is not in a room', async () => {
      const client = createMockSocket({ user: mockUser });

      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Not in a room',
      });
    });

    it('should emit ERROR when the room is not found in Redis', async () => {
      roomService.getRoomState.mockResolvedValue(null);

      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Room not found',
      });
    });

    it('should emit ERROR when the player is not in the room state', async () => {
      const room = createMockRoom({
        players: [
          {
            id: 'user-other',
            username: 'other',
            guesses: 0,
            status: PLAYER_STATUS.PLAYING,
            socketId: 'socket-other',
          },
        ],
      });
      roomService.getRoomState.mockResolvedValue(room);

      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Player not in room',
      });
    });

    it('should emit ERROR when the player has already won', async () => {
      const room = createMockRoom();
      room.players[0].status = PLAYER_STATUS.WON;
      roomService.getRoomState.mockResolvedValue(room);

      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Game already finished for this player',
      });
    });

    it('should emit ERROR when the player has already lost', async () => {
      const room = createMockRoom();
      room.players[0].status = PLAYER_STATUS.LOST;
      roomService.getRoomState.mockResolvedValue(room);

      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Game already finished for this player',
      });
    });

    it('should emit ERROR when the word is not valid', async () => {
      const room = createMockRoom();
      roomService.getRoomState.mockResolvedValue(room);
      wordService.isValid.mockReturnValue(false);

      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleSubmitGuess(client, { word: 'zzzzz' });

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Invalid word',
      });
    });

    it('should not call evaluateWord when validation fails', async () => {
      const room = createMockRoom();
      roomService.getRoomState.mockResolvedValue(room);
      wordService.isValid.mockReturnValue(false);

      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleSubmitGuess(client, { word: 'zzzzz' });

      expect(gameService.evaluateWord).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // handleSubmitGuess — correct guess (win)
  // ---------------------------------------------------------------------------
  describe('handleSubmitGuess — correct guess (win)', () => {
    let client: AuthenticatedSocket;
    let room: RoomState;

    beforeEach(() => {
      room = createMockRoom();
      roomService.getRoomState.mockResolvedValue(room);
      wordService.isValid.mockReturnValue(true);
      gameService.evaluateWord.mockReturnValue([
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
      ]);

      client = createMockSocket({ user: mockUser, roomId: 'room-1' });
    });

    it('should evaluate the word in lowercase against the room answer', async () => {
      await gateway.handleSubmitGuess(client, { word: 'CRANE' });

      expect(gameService.evaluateWord).toHaveBeenCalledWith('crane', 'crane');
    });

    it('should increment the player guess count', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(room.players[0].guesses).toBe(1);
    });

    it('should set the player status to WON', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(room.players[0].status).toBe(PLAYER_STATUS.WON);
    });

    it('should publish GUESS_RESULT via Redis pub/sub', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(redisService.publish).toHaveBeenCalledWith(
        'game-events',
        expect.stringContaining('"type":"GUESS_RESULT"'),
      );

      const publishCall = redisService.publish.mock.calls.find(
        (call) =>
          typeof call[1] === 'string' && call[1].includes('GUESS_RESULT'),
      );
      expect(publishCall).toBeDefined();
      const parsed = JSON.parse(publishCall![1]) as Record<string, unknown>;
      expect(parsed).toMatchObject({
        roomId: 'room-1',
        type: 'GUESS_RESULT',
        payload: {
          playerId: mockUser.id,
          guessNumber: 1,
        },
      });
    });

    it('should publish PLAYER_WON via Redis pub/sub', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(redisService.publish).toHaveBeenCalledWith(
        'game-events',
        expect.stringContaining('"type":"PLAYER_WON"'),
      );

      const publishCall = redisService.publish.mock.calls.find(
        (call) => typeof call[1] === 'string' && call[1].includes('PLAYER_WON'),
      );
      const parsed = JSON.parse(publishCall![1]) as Record<string, unknown>;
      expect(parsed).toMatchObject({
        roomId: 'room-1',
        type: 'PLAYER_WON',
        payload: {
          playerId: mockUser.id,
          guessCount: 1,
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // handleSubmitGuess — incorrect guess (continuing)
  // ---------------------------------------------------------------------------
  describe('handleSubmitGuess — incorrect guess', () => {
    let client: AuthenticatedSocket;
    let room: RoomState;
    const incorrectResults = [
      LETTER_RESULT.ABSENT,
      LETTER_RESULT.PRESENT,
      LETTER_RESULT.ABSENT,
      LETTER_RESULT.CORRECT,
      LETTER_RESULT.ABSENT,
    ];

    beforeEach(() => {
      room = createMockRoom();
      roomService.getRoomState.mockResolvedValue(room);
      wordService.isValid.mockReturnValue(true);
      gameService.evaluateWord.mockReturnValue(incorrectResults);

      client = createMockSocket({ user: mockUser, roomId: 'room-1' });
    });

    it('should keep the player status as PLAYING when guesses remain', async () => {
      room.players[0].guesses = 0;

      await gateway.handleSubmitGuess(client, { word: 'stale' });

      expect(room.players[0].status).toBe(PLAYER_STATUS.PLAYING);
    });

    it('should increment the guess count', async () => {
      room.players[0].guesses = 2;

      await gateway.handleSubmitGuess(client, { word: 'stale' });

      expect(room.players[0].guesses).toBe(3);
    });

    it('should save the in-progress state to Redis (not finalizeRoom)', async () => {
      await gateway.handleSubmitGuess(client, { word: 'stale' });

      expect(redisService.set).toHaveBeenCalledWith(
        'room:room-1',
        expect.any(String),
        60 * 60 * 24,
      );
      expect(roomService.finalizeRoom).not.toHaveBeenCalled();
    });

    it('should publish GUESS_RESULT but NOT PLAYER_WON', async () => {
      await gateway.handleSubmitGuess(client, { word: 'stale' });

      const publishedMessages = redisService.publish.mock.calls.map(
        (call) => call[1],
      );

      expect(
        publishedMessages.some(
          (m) => typeof m === 'string' && m.includes('GUESS_RESULT'),
        ),
      ).toBe(true);
      expect(
        publishedMessages.some(
          (m) => typeof m === 'string' && m.includes('PLAYER_WON'),
        ),
      ).toBe(false);
    });

    it('should NOT publish GAME_OVER when other players are still playing', async () => {
      await gateway.handleSubmitGuess(client, { word: 'stale' });

      const publishedMessages = redisService.publish.mock.calls.map(
        (call) => call[1],
      );
      expect(
        publishedMessages.some(
          (m) => typeof m === 'string' && m.includes('GAME_OVER'),
        ),
      ).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // handleSubmitGuess — 6th incorrect guess (loss)
  // ---------------------------------------------------------------------------
  describe('handleSubmitGuess — player loses after 6 guesses', () => {
    let client: AuthenticatedSocket;
    let room: RoomState;

    beforeEach(() => {
      room = createMockRoom();
      room.players[0].guesses = 5; // 5 previous guesses, this will be the 6th
      roomService.getRoomState.mockResolvedValue(room);
      wordService.isValid.mockReturnValue(true);
      gameService.evaluateWord.mockReturnValue([
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.PRESENT,
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
      ]);

      client = createMockSocket({ user: mockUser, roomId: 'room-1' });
    });

    it('should set the player status to LOST after 6 incorrect guesses', async () => {
      await gateway.handleSubmitGuess(client, { word: 'wrong' });

      expect(room.players[0].status).toBe(PLAYER_STATUS.LOST);
      expect(room.players[0].guesses).toBe(6);
    });

    it('should not set status to LOST before the 6th guess', async () => {
      room.players[0].guesses = 4; // this will be the 5th

      await gateway.handleSubmitGuess(client, { word: 'wrong' });

      expect(room.players[0].status).toBe(PLAYER_STATUS.PLAYING);
      expect(room.players[0].guesses).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // handleSubmitGuess — game over (all players finished) — finalizeRoom
  // ---------------------------------------------------------------------------
  describe('handleSubmitGuess — game over (all finished)', () => {
    let client: AuthenticatedSocket;
    let room: RoomState;

    beforeEach(() => {
      room = createMockRoom();
      // Second player already finished
      room.players[1].status = PLAYER_STATUS.LOST;
      room.players[1].guesses = 6;

      roomService.getRoomState.mockResolvedValue(room);
      wordService.isValid.mockReturnValue(true);
      gameService.evaluateWord.mockReturnValue([
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
      ]);

      client = createMockSocket({ user: mockUser, roomId: 'room-1' });
    });

    it('should set room status to FINISHED when all players are done', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(room.status).toBe(ROOM_STATUS.FINISHED);
    });

    it('should call room.finalizeRoom instead of direct Redis set', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(roomService.finalizeRoom).toHaveBeenCalledWith('room-1', room);
      // Should NOT call redis.set directly for the room
      expect(redisService.set).not.toHaveBeenCalledWith(
        'room:room-1',
        expect.any(String),
        expect.any(Number),
      );
    });

    it('should publish GAME_OVER event with the answer', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(redisService.publish).toHaveBeenCalledWith(
        'game-events',
        expect.stringContaining('"type":"GAME_OVER"'),
      );

      const publishCall = redisService.publish.mock.calls.find(
        (call) => typeof call[1] === 'string' && call[1].includes('GAME_OVER'),
      );
      const parsed = JSON.parse(publishCall![1]) as Record<string, unknown>;
      expect(parsed).toMatchObject({
        roomId: 'room-1',
        type: 'GAME_OVER',
        payload: { answer: 'crane' },
      });
    });

    it('should publish both PLAYER_WON and GAME_OVER when the winning guess finishes the game', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      const publishedMessages = redisService.publish.mock.calls.map(
        (call) => call[1],
      );

      expect(
        publishedMessages.some(
          (m) => typeof m === 'string' && m.includes('PLAYER_WON'),
        ),
      ).toBe(true);
      expect(
        publishedMessages.some(
          (m) => typeof m === 'string' && m.includes('GAME_OVER'),
        ),
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // handleSubmitGuess — game over when last player loses (not wins)
  // ---------------------------------------------------------------------------
  describe('handleSubmitGuess — game over on loss', () => {
    it('should finalize the room when the last player loses', async () => {
      const room = createMockRoom();
      room.players[0].guesses = 5; // 6th guess incoming
      room.players[1].status = PLAYER_STATUS.WON;
      room.players[1].guesses = 3;

      roomService.getRoomState.mockResolvedValue(room);
      wordService.isValid.mockReturnValue(true);
      gameService.evaluateWord.mockReturnValue([
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
      ]);

      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleSubmitGuess(client, { word: 'wrong' });

      expect(room.players[0].status).toBe(PLAYER_STATUS.LOST);
      expect(room.status).toBe(ROOM_STATUS.FINISHED);
      expect(roomService.finalizeRoom).toHaveBeenCalledWith('room-1', room);

      const publishedMessages = redisService.publish.mock.calls.map(
        (call) => call[1],
      );
      expect(
        publishedMessages.some(
          (m) => typeof m === 'string' && m.includes('GAME_OVER'),
        ),
      ).toBe(true);
      // Should NOT publish PLAYER_WON since the player lost
      expect(
        publishedMessages.some(
          (m) => typeof m === 'string' && m.includes('PLAYER_WON'),
        ),
      ).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // handleSubmitGuess — game continues when other players still playing
  // ---------------------------------------------------------------------------
  describe('handleSubmitGuess — game continues when other players are still playing', () => {
    let client: AuthenticatedSocket;
    let room: RoomState;

    beforeEach(() => {
      room = createMockRoom();
      // Second player is still playing
      room.players[1].status = PLAYER_STATUS.PLAYING;

      roomService.getRoomState.mockResolvedValue(room);
      wordService.isValid.mockReturnValue(true);
      gameService.evaluateWord.mockReturnValue([
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
      ]);

      client = createMockSocket({ user: mockUser, roomId: 'room-1' });
    });

    it('should NOT set room status to FINISHED', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(room.status).toBe(ROOM_STATUS.IN_PROGRESS);
    });

    it('should NOT call finalizeRoom', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(roomService.finalizeRoom).not.toHaveBeenCalled();
    });

    it('should save to Redis directly (in-progress state)', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(redisService.set).toHaveBeenCalledWith(
        'room:room-1',
        expect.any(String),
        60 * 60 * 24,
      );
    });

    it('should NOT publish GAME_OVER event', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      const publishedMessages = redisService.publish.mock.calls.map(
        (call) => call[1],
      );
      expect(
        publishedMessages.some(
          (m) => typeof m === 'string' && m.includes('GAME_OVER'),
        ),
      ).toBe(false);
    });

    it('should still publish PLAYER_WON for the winning player', async () => {
      await gateway.handleSubmitGuess(client, { word: 'crane' });

      const publishedMessages = redisService.publish.mock.calls.map(
        (call) => call[1],
      );
      expect(
        publishedMessages.some(
          (m) => typeof m === 'string' && m.includes('PLAYER_WON'),
        ),
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // handleSubmitGuess — Redis state persistence on in-progress update
  // ---------------------------------------------------------------------------
  describe('handleSubmitGuess — Redis state correctness', () => {
    it('should persist the updated guess count and player status to Redis', async () => {
      const room = createMockRoom();
      roomService.getRoomState.mockResolvedValue(room);
      wordService.isValid.mockReturnValue(true);
      gameService.evaluateWord.mockReturnValue([
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
      ]);

      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleSubmitGuess(client, { word: 'stale' });

      expect(redisService.set).toHaveBeenCalledWith(
        'room:room-1',
        expect.any(String),
        60 * 60 * 24,
      );

      const savedState = JSON.parse(
        redisService.set.mock.calls[0][1],
      ) as RoomState;
      expect(savedState.players[0].guesses).toBe(1);
      expect(savedState.players[0].status).toBe(PLAYER_STATUS.PLAYING);
    });
  });

  // ---------------------------------------------------------------------------
  // handleSubmitGuess — error handling
  // ---------------------------------------------------------------------------
  describe('handleSubmitGuess — error handling', () => {
    it('should emit ERROR with the error message on failure', async () => {
      roomService.getRoomState.mockRejectedValue(
        new Error('Redis connection lost'),
      );

      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'Redis connection lost',
      });
    });

    it('should emit a generic error message for non-Error throws', async () => {
      roomService.getRoomState.mockRejectedValue(42);

      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await gateway.handleSubmitGuess(client, { word: 'crane' });

      expect(client.emit).toHaveBeenCalledWith('ERROR', {
        message: 'An unexpected error occurred',
      });
    });

    it('should not propagate the error — the gateway should not throw', async () => {
      roomService.getRoomState.mockRejectedValue(new Error('boom'));

      const client = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });

      await expect(
        gateway.handleSubmitGuess(client, { word: 'crane' }),
      ).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // publishEvent (private) — tested indirectly through gateway methods
  // ---------------------------------------------------------------------------
  describe('publishEvent (via gateway methods)', () => {
    it('should publish serialized JSON with roomId, type, and payload', async () => {
      const room = createMockRoom();
      roomService.joinRoom.mockResolvedValue(room);

      const client = createMockSocket({ user: mockUser });

      await gateway.handleJoinRoom(client, { roomId: 'room-1' });

      expect(redisService.publish).toHaveBeenCalledWith(
        'game-events',
        expect.any(String),
      );

      const rawMessage = redisService.publish.mock.calls[0][1];
      const parsed = JSON.parse(rawMessage) as {
        roomId: string;
        type: string;
        payload: Record<string, unknown>;
      };

      expect(parsed.roomId).toBe('room-1');
      expect(parsed.type).toBe('PLAYER_JOINED');
      expect(parsed.payload).toBeDefined();
    });

    it('should always publish to the "game-events" channel', async () => {
      const room = createMockRoom();
      roomService.joinRoom.mockResolvedValue(room);

      const client = createMockSocket({ user: mockUser });
      await gateway.handleJoinRoom(client, { roomId: 'room-1' });

      // Disconnect
      const disconnectClient = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });
      await gateway.handleDisconnect(disconnectClient);

      for (const call of redisService.publish.mock.calls) {
        expect(call[0]).toBe('game-events');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Integration-like: full flow — create, join, guess, win, game over
  // ---------------------------------------------------------------------------
  describe('full game flow integration', () => {
    it('should handle a complete game: create → join → guess → game over', async () => {
      // Player 1 creates a room
      const roomAfterCreate = createMockRoom({
        status: ROOM_STATUS.WAITING,
        players: [
          {
            id: 'user-1',
            username: 'alice',
            guesses: 0,
            status: PLAYER_STATUS.PLAYING,
            socketId: 'socket-1',
          },
        ],
      });
      roomService.createRoom.mockResolvedValue(roomAfterCreate);

      const client1 = createMockSocket({ user: mockUser });
      const createResult = await gateway.handleCreateRoom(client1);

      expect(createResult).toEqual({
        event: 'ROOM_CREATED',
        data: roomAfterCreate,
      });

      // Player 2 joins
      const roomAfterJoin = createMockRoom({
        status: ROOM_STATUS.IN_PROGRESS,
      });
      roomService.joinRoom.mockResolvedValue(roomAfterJoin);

      const client2 = createMockSocket({ user: mockUser2 });
      const joinResult = await gateway.handleJoinRoom(client2, {
        roomId: 'room-1',
      });

      expect(joinResult).toEqual({
        event: 'ROOM_STATE',
        data: roomAfterJoin,
      });

      // Player 1 guesses correctly — but player 2 is still playing
      const roomForGuess = createMockRoom();
      roomService.getRoomState.mockResolvedValue(roomForGuess);
      wordService.isValid.mockReturnValue(true);
      gameService.evaluateWord.mockReturnValue([
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
        LETTER_RESULT.CORRECT,
      ]);

      const guessClient1 = createMockSocket({
        user: mockUser,
        roomId: 'room-1',
      });
      await gateway.handleSubmitGuess(guessClient1, { word: 'crane' });

      // Player 1 won, but game is NOT over (player 2 still playing)
      expect(roomForGuess.players[0].status).toBe(PLAYER_STATUS.WON);
      expect(roomForGuess.status).toBe(ROOM_STATUS.IN_PROGRESS);
      expect(roomService.finalizeRoom).not.toHaveBeenCalled();

      // Player 2 guesses and loses (6th wrong guess)
      const roomForGuess2 = createMockRoom();
      roomForGuess2.players[0].status = PLAYER_STATUS.WON; // player 1 already won
      roomForGuess2.players[1].guesses = 5;
      roomService.getRoomState.mockResolvedValue(roomForGuess2);
      gameService.evaluateWord.mockReturnValue([
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
        LETTER_RESULT.ABSENT,
      ]);

      const guessClient2 = createMockSocket({
        user: mockUser2,
        roomId: 'room-1',
      });
      await gateway.handleSubmitGuess(guessClient2, { word: 'wrong' });

      // Now game IS over
      expect(roomForGuess2.players[1].status).toBe(PLAYER_STATUS.LOST);
      expect(roomForGuess2.status).toBe(ROOM_STATUS.FINISHED);
      expect(roomService.finalizeRoom).toHaveBeenCalledWith(
        'room-1',
        roomForGuess2,
      );
    });
  });
});
