import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GameModule } from './game/game.module';
import { RedisModule } from './redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { WordModule } from './word/word.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { RateLimitGuard } from './common/guard/rate-limit.guard';
import { RoomModule } from './room/room.module';
import { AIModule } from './ai/ai.module';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .required(),
        DATABASE_URL: Joi.string().uri().required(),
        REDIS_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        COOKIE_SECRET: Joi.string().min(32).required(),
        GROQ_API_KEY: Joi.string().required(),
        GROQ_MODEL: Joi.string().required(),
      }),
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    GameModule,
    WordModule,
    RoomModule,
    AIModule,
  ],
  providers: [Reflector, RateLimitGuard],
})
export class AppModule {}
