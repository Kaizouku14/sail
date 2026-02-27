import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { RedisService } from '@/redis/redis.service';

interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

export const RateLimit = (limit: number, windowSeconds: number) =>
  SetMetadata<string, RateLimitOptions>('rateLimit', { limit, windowSeconds });

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions | undefined>(
      'rateLimit',
      context.getHandler(),
    );

    const limit = rateLimitOptions?.limit ?? 10;
    const windowSeconds = rateLimitOptions?.windowSeconds ?? 60;

    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // use user ID if authenticated, fall back to IP
    const user = request['user'] as { id: string } | undefined;
    const identifier: string = user?.id ?? request.ip ?? 'unknown';
    const key = `rate:${context.getHandler().name}:${identifier}`;

    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // sliding window in Redis
    await this.redisService.zremrangebyscore(key, 0, windowStart);
    await this.redisService.zadd(key, now, `${now}`);
    await this.redisService.expire(key, windowSeconds);
    const count: number = await this.redisService.zcard(key);

    if (count > limit) {
      throw new HttpException(
        {
          message: 'Too many requests',
          retryAfter: windowSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
