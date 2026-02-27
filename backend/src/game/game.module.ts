import { Module, forwardRef } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { WordModule } from '@/word/word.module';
import { AuthModule } from '@/auth/auth.module';
import { GameGateway } from './game.gateway';
import { RoomModule } from '@/room/room.module';
import { AIModule } from '@/ai/ai.module';

@Module({
  imports: [WordModule, AuthModule, forwardRef(() => RoomModule), AIModule],
  providers: [GameService, GameGateway],
  controllers: [GameController],
  exports: [GameService],
})
export class GameModule {}
