/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

// Mock ioredis
const mockRedisInstance = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  zadd: jest.fn(),
  zremrangebyscore: jest.fn(),
  zcard: jest.fn(),
  expire: jest.fn(),
  publish: jest.fn(),
  subscribe: jest.fn(),
  on: jest.fn(),
  quit: jest.fn(),
});

let redisInstances: ReturnType<typeof mockRedisInstance>[] = [];

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      const instance = mockRedisInstance();
      redisInstances.push(instance);
      return instance;
    }),
  };
});

describe('RedisService', () => {
  let service: RedisService;
  let configService: ConfigService;

  beforeEach(async () => {
    redisInstances = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('redis://localhost:6379'),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('onModuleInit', () => {
    it('should create two separate Redis connections (command + subscriber)', () => {
      service.onModuleInit();

      expect(redisInstances).toHaveLength(2);
    });

    it('should use the REDIS_URL from config for both clients', () => {
      service.onModuleInit();

      expect(configService.get).toHaveBeenCalledWith('REDIS_URL');
    });

    it('should create two distinct Redis instances (Redis pub/sub requirement)', () => {
      service.onModuleInit();

      const [client, subscriber] = redisInstances;
      expect(client).not.toBe(subscriber);
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit both the client and subscriber connections', async () => {
      service.onModuleInit();

      const [client, subscriber] = redisInstances;

      await service.onModuleDestroy();

      expect(subscriber.quit).toHaveBeenCalled();
      expect(client.quit).toHaveBeenCalled();
    });

    it('should quit the subscriber before the command client', async () => {
      service.onModuleInit();

      const [client, subscriber] = redisInstances;
      const callOrder: string[] = [];

      subscriber.quit.mockImplementation(async () => {
        callOrder.push('subscriber');
      });
      client.quit.mockImplementation(async () => {
        callOrder.push('client');
      });

      await service.onModuleDestroy();

      expect(callOrder).toEqual(['subscriber', 'client']);
    });
  });

  describe('get', () => {
    it('should call client.get with the correct key', async () => {
      service.onModuleInit();
      const [client] = redisInstances;
      client.get.mockResolvedValue('value');

      const result = await service.get('test-key');

      expect(client.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('value');
    });

    it('should return null when key does not exist', async () => {
      service.onModuleInit();
      const [client] = redisInstances;
      client.get.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set a value without TTL', async () => {
      service.onModuleInit();
      const [client] = redisInstances;

      await service.set('key', 'value');

      expect(client.set).toHaveBeenCalledWith('key', 'value');
    });

    it('should set a value with TTL when ttlSeconds is provided', async () => {
      service.onModuleInit();
      const [client] = redisInstances;

      await service.set('key', 'value', 3600);

      expect(client.set).toHaveBeenCalledWith('key', 'value', 'EX', 3600);
    });

    it('should not set TTL when ttlSeconds is 0 (falsy)', async () => {
      service.onModuleInit();
      const [client] = redisInstances;

      await service.set('key', 'value', 0);

      expect(client.set).toHaveBeenCalledWith('key', 'value');
    });
  });

  describe('del', () => {
    it('should delete the key', async () => {
      service.onModuleInit();
      const [client] = redisInstances;

      await service.del('key');

      expect(client.del).toHaveBeenCalledWith('key');
    });
  });

  describe('zadd', () => {
    it('should add a member with score to a sorted set', async () => {
      service.onModuleInit();
      const [client] = redisInstances;

      await service.zadd('myset', 100, 'member1');

      expect(client.zadd).toHaveBeenCalledWith('myset', 100, 'member1');
    });
  });

  describe('zremrangebyscore', () => {
    it('should remove members within the score range', async () => {
      service.onModuleInit();
      const [client] = redisInstances;

      await service.zremrangebyscore('myset', 0, 50);

      expect(client.zremrangebyscore).toHaveBeenCalledWith('myset', 0, 50);
    });
  });

  describe('zcard', () => {
    it('should return the cardinality of the sorted set', async () => {
      service.onModuleInit();
      const [client] = redisInstances;
      client.zcard.mockResolvedValue(5);

      const result = await service.zcard('myset');

      expect(client.zcard).toHaveBeenCalledWith('myset');
      expect(result).toBe(5);
    });
  });

  describe('expire', () => {
    it('should set the expiration on a key', async () => {
      service.onModuleInit();
      const [client] = redisInstances;

      await service.expire('key', 120);

      expect(client.expire).toHaveBeenCalledWith('key', 120);
    });
  });

  describe('publish', () => {
    it('should publish a message to the channel using the command client', async () => {
      service.onModuleInit();
      const [client] = redisInstances;

      await service.publish('game-events', '{"type":"test"}');

      expect(client.publish).toHaveBeenCalledWith(
        'game-events',
        '{"type":"test"}',
      );
    });

    it('should use the command client, not the subscriber client', async () => {
      service.onModuleInit();
      const [, subscriber] = redisInstances;

      await service.publish('channel', 'message');

      expect(subscriber.publish).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should subscribe on the dedicated subscriber client', async () => {
      service.onModuleInit();
      const [client, subscriber] = redisInstances;

      await service.subscribe('game-events', jest.fn());

      expect(subscriber.subscribe).toHaveBeenCalledWith('game-events');
      expect(client.subscribe).not.toHaveBeenCalled();
    });

    it('should register a message listener on the subscriber client', async () => {
      service.onModuleInit();
      const [, subscriber] = redisInstances;

      const callback = jest.fn();
      await service.subscribe('game-events', callback);

      expect(subscriber.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });

    it('should invoke the callback when a message arrives on the subscribed channel', async () => {
      service.onModuleInit();
      const [, subscriber] = redisInstances;

      const callback = jest.fn();
      await service.subscribe('game-events', callback);

      // Extract the registered listener
      const messageHandler = subscriber.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message',
      )?.[1] as (channel: string, message: string) => void;

      expect(messageHandler).toBeDefined();

      messageHandler('game-events', '{"type":"PLAYER_JOINED"}');

      expect(callback).toHaveBeenCalledWith('{"type":"PLAYER_JOINED"}');
    });

    it('should NOT invoke the callback when a message arrives on a different channel', async () => {
      service.onModuleInit();
      const [, subscriber] = redisInstances;

      const callback = jest.fn();
      await service.subscribe('game-events', callback);

      const messageHandler = subscriber.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'message',
      )?.[1] as (channel: string, message: string) => void;

      messageHandler('other-channel', '{"type":"something"}');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not use the command client for subscribing (Redis pub/sub requirement)', async () => {
      service.onModuleInit();
      const [client] = redisInstances;

      await service.subscribe('game-events', jest.fn());

      expect(client.subscribe).not.toHaveBeenCalled();
      expect(client.on).not.toHaveBeenCalled();
    });
  });
});
