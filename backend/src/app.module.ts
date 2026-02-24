import { Module } from '@nestjs/common';
import { GameModule } from './game/game.module';
import { RedisModule } from './redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { WordModule } from './word/word.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    GameModule,
    WordModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
