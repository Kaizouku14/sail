import { Module } from '@nestjs/common';
import { WordService } from './word.service';

@Module({
  controllers: [],
  providers: [WordService],
})
export class GameModule {}
