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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    GameModule,
    WordModule,
    RoomModule,
  ],
  providers: [Reflector, RateLimitGuard],
})
export class AppModule {}
