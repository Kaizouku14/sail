/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisService } from '@/redis/redis.service';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let redisService: jest.Mocked<RedisService>;
  let reflector: jest.Mocked<Reflector>;

  const mockRedisService = () => ({
    zremrangebyscore: jest.fn().mockResolvedValue(undefined),
    zadd: jest.fn().mockResolvedValue(undefined),
    expire: jest.fn().mockResolvedValue(undefined),
    zcard: jest.fn().mockResolvedValue(1),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
  });

  const createMockExecutionContext = (
    overrides: { userId?: string; ip?: string; handlerName?: string } = {},
  ): ExecutionContext => {
    const { userId, ip = '127.0.0.1', handlerName = 'testHandler' } = overrides;

    const mockRequest: Record<string, unknown> = { ip };
    if (userId) {
      mockRequest['user'] = { id: userId };
    }

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getHandler: () => {
        const fn = (): void => {};
        Object.defineProperty(fn, 'name', { value: handlerName });
        return fn;
      },
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: RedisService, useFactory: mockRedisService },
        {
          provide: Reflector,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
    reflector = module.get(Reflector) as jest.Mocked<Reflector>;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('default rate limit (no decorator metadata)', () => {
    it('should allow requests under the default limit of 10', async () => {
      reflector.get.mockReturnValue(undefined);
      redisService.zcard.mockResolvedValue(5);

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should use default limit=10, windowSeconds=60 when no metadata is set', async () => {
      reflector.get.mockReturnValue(undefined);
      redisService.zcard.mockResolvedValue(1);

      const context = createMockExecutionContext();
      await guard.canActivate(context);

      expect(redisService.expire).toHaveBeenCalledWith(expect.any(String), 60);
    });

    it('should block requests exceeding the default limit of 10', async () => {
      reflector.get.mockReturnValue(undefined);
      redisService.zcard.mockResolvedValue(11);

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });
  });

  describe('custom rate limit via @RateLimit decorator', () => {
    it('should respect a custom limit from decorator metadata', async () => {
      reflector.get.mockReturnValue({ limit: 3, windowSeconds: 30 });
      redisService.zcard.mockResolvedValue(2);

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should block when exceeding the custom limit', async () => {
      reflector.get.mockReturnValue({ limit: 3, windowSeconds: 30 });
      redisService.zcard.mockResolvedValue(4);

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should use the custom windowSeconds for expire', async () => {
      reflector.get.mockReturnValue({ limit: 5, windowSeconds: 120 });
      redisService.zcard.mockResolvedValue(1);

      const context = createMockExecutionContext();
      await guard.canActivate(context);

      expect(redisService.expire).toHaveBeenCalledWith(expect.any(String), 120);
    });

    it('should allow exactly the limit count (boundary)', async () => {
      reflector.get.mockReturnValue({ limit: 5, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(5);

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should block at limit + 1 (boundary)', async () => {
      reflector.get.mockReturnValue({ limit: 5, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(6);

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });
  });

  describe('sliding window Redis operations', () => {
    it('should remove expired entries from the sorted set', async () => {
      reflector.get.mockReturnValue({ limit: 10, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(1);

      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const context = createMockExecutionContext();
      await guard.canActivate(context);

      const expectedWindowStart = now - 60 * 1000;
      expect(redisService.zremrangebyscore).toHaveBeenCalledWith(
        expect.any(String),
        0,
        expectedWindowStart,
      );

      jest.restoreAllMocks();
    });

    it('should add the current timestamp to the sorted set', async () => {
      reflector.get.mockReturnValue({ limit: 10, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(1);

      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const context = createMockExecutionContext();
      await guard.canActivate(context);

      expect(redisService.zadd).toHaveBeenCalledWith(
        expect.any(String),
        now,
        `${now}`,
      );

      jest.restoreAllMocks();
    });

    it('should set the expiration on the sorted set key', async () => {
      reflector.get.mockReturnValue({ limit: 10, windowSeconds: 90 });
      redisService.zcard.mockResolvedValue(1);

      const context = createMockExecutionContext();
      await guard.canActivate(context);

      expect(redisService.expire).toHaveBeenCalledWith(expect.any(String), 90);
    });

    it('should call Redis operations in the correct order', async () => {
      reflector.get.mockReturnValue({ limit: 10, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(1);

      const callOrder: string[] = [];
      redisService.zremrangebyscore.mockImplementation(async () => {
        callOrder.push('zremrangebyscore');
      });
      redisService.zadd.mockImplementation(async () => {
        callOrder.push('zadd');
      });
      redisService.expire.mockImplementation(async () => {
        callOrder.push('expire');
      });
      redisService.zcard.mockImplementation(async () => {
        callOrder.push('zcard');
        return 1;
      });

      const context = createMockExecutionContext();
      await guard.canActivate(context);

      expect(callOrder).toEqual([
        'zremrangebyscore',
        'zadd',
        'expire',
        'zcard',
      ]);
    });
  });

  describe('identifier resolution', () => {
    it('should use the authenticated user ID when available', async () => {
      reflector.get.mockReturnValue({ limit: 10, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(1);

      const context = createMockExecutionContext({
        userId: 'user-123',
        handlerName: 'myEndpoint',
      });
      await guard.canActivate(context);

      expect(redisService.zadd).toHaveBeenCalledWith(
        'rate:myEndpoint:user-123',
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should fall back to IP address when user is not authenticated', async () => {
      reflector.get.mockReturnValue({ limit: 10, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(1);

      const context = createMockExecutionContext({
        ip: '192.168.1.100',
        handlerName: 'myEndpoint',
      });
      await guard.canActivate(context);

      expect(redisService.zadd).toHaveBeenCalledWith(
        'rate:myEndpoint:192.168.1.100',
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should use "unknown" when neither user nor IP is available', async () => {
      reflector.get.mockReturnValue({ limit: 10, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(1);

      const mockRequest: Record<string, unknown> = { ip: undefined };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => {
          const fn = (): void => {};
          Object.defineProperty(fn, 'name', { value: 'myEndpoint' });
          return fn;
        },
      } as unknown as ExecutionContext;

      await guard.canActivate(context);

      expect(redisService.zadd).toHaveBeenCalledWith(
        'rate:myEndpoint:unknown',
        expect.any(Number),
        expect.any(String),
      );
    });
  });

  describe('Redis key format', () => {
    it('should include the handler name in the key for per-route limiting', async () => {
      reflector.get.mockReturnValue({ limit: 10, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(1);

      const context = createMockExecutionContext({
        ip: '10.0.0.1',
        handlerName: 'submitGuess',
      });
      await guard.canActivate(context);

      expect(redisService.zadd).toHaveBeenCalledWith(
        'rate:submitGuess:10.0.0.1',
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should generate different keys for different handlers', async () => {
      reflector.get.mockReturnValue({ limit: 10, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(1);

      const context1 = createMockExecutionContext({
        ip: '10.0.0.1',
        handlerName: 'handlerA',
      });
      const context2 = createMockExecutionContext({
        ip: '10.0.0.1',
        handlerName: 'handlerB',
      });

      await guard.canActivate(context1);
      await guard.canActivate(context2);

      const key1 = (
        redisService.zadd.mock.calls[0] as [string, number, string]
      )[0];
      const key2 = (
        redisService.zadd.mock.calls[1] as [string, number, string]
      )[0];

      expect(key1).toBe('rate:handlerA:10.0.0.1');
      expect(key2).toBe('rate:handlerB:10.0.0.1');
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different users on the same handler', async () => {
      reflector.get.mockReturnValue({ limit: 10, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(1);

      const context1 = createMockExecutionContext({
        userId: 'user-a',
        handlerName: 'guess',
      });
      const context2 = createMockExecutionContext({
        userId: 'user-b',
        handlerName: 'guess',
      });

      await guard.canActivate(context1);
      await guard.canActivate(context2);

      const key1 = (
        redisService.zadd.mock.calls[0] as [string, number, string]
      )[0];
      const key2 = (
        redisService.zadd.mock.calls[1] as [string, number, string]
      )[0];

      expect(key1).toBe('rate:guess:user-a');
      expect(key2).toBe('rate:guess:user-b');
    });
  });

  describe('error response', () => {
    it('should throw HttpException with 429 status', async () => {
      reflector.get.mockReturnValue({ limit: 1, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(2);

      const context = createMockExecutionContext();

      try {
        await guard.canActivate(context);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    });

    it('should include "Too many requests" message in the response', async () => {
      reflector.get.mockReturnValue({ limit: 1, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(2);

      const context = createMockExecutionContext();

      try {
        await guard.canActivate(context);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        const response = (error as HttpException).getResponse() as Record<
          string,
          unknown
        >;
        expect(response.message).toBe('Too many requests');
      }
    });

    it('should include retryAfter matching the windowSeconds', async () => {
      reflector.get.mockReturnValue({ limit: 1, windowSeconds: 45 });
      redisService.zcard.mockResolvedValue(2);

      const context = createMockExecutionContext();

      try {
        await guard.canActivate(context);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        const response = (error as HttpException).getResponse() as Record<
          string,
          unknown
        >;
        expect(response.retryAfter).toBe(45);
      }
    });

    it('should include retryAfter matching the default windowSeconds when no metadata', async () => {
      reflector.get.mockReturnValue(undefined);
      redisService.zcard.mockResolvedValue(11);

      const context = createMockExecutionContext();

      try {
        await guard.canActivate(context);
        fail('Expected HttpException to be thrown');
      } catch (error) {
        const response = (error as HttpException).getResponse() as Record<
          string,
          unknown
        >;
        expect(response.retryAfter).toBe(60);
      }
    });
  });

  describe('concurrent requests edge cases', () => {
    it('should count the current request in the window (zadd before zcard)', async () => {
      reflector.get.mockReturnValue({ limit: 1, windowSeconds: 60 });

      // zcard returns 1 meaning the current request was just added and is the only one
      redisService.zcard.mockResolvedValue(1);

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(redisService.zadd).toHaveBeenCalled();
      expect(redisService.zcard).toHaveBeenCalled();
    });

    it('should still set expire even when the request is about to be blocked', async () => {
      reflector.get.mockReturnValue({ limit: 1, windowSeconds: 60 });
      redisService.zcard.mockResolvedValue(2);

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      // expire should still have been called before the throw
      expect(redisService.expire).toHaveBeenCalled();
    });
  });
});
