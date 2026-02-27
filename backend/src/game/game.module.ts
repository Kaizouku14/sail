import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { WordModule } from '@/word/word.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [WordModule, AuthModule],
  providers: [GameService],
  controllers: [GameController],
  exports: [GameService],
})
export class GameModule {}
