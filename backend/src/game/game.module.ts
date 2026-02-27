import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { WordModule } from '@/word/word.module';
import { AuthModule } from '@/auth/auth.module';
import { GameGateway } from './game.gateway';
import { RoomModule } from '@/room/room.module';

@Module({
  imports: [WordModule, AuthModule, RoomModule],
  providers: [GameService, GameGateway],
  controllers: [GameController],
  exports: [GameService],
})
export class GameModule {}
