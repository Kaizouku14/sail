import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { WordModule } from 'src/word/word.module';

@Module({
  controllers: [GameController],
  providers: [GameService],
  imports: [WordModule],
})
export class GameModule {}
