import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { WordModule } from '@/word/word.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  controllers: [GameController],
  providers: [GameService],
  imports: [WordModule, AuthModule],
})
export class GameModule {}
