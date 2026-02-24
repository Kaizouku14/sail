import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { WordModule } from '@/word/word.module';

@Module({
  controllers: [GameController],
  providers: [GameService],
  imports: [WordModule],
})
export class GameModule {}
