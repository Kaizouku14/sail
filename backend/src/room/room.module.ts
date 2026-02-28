import { Module, forwardRef } from '@nestjs/common';
import { RoomService } from './room.service';
import { RaceController } from './race.controller';
import { GameModule } from '@/game/game.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [forwardRef(() => GameModule), AuthModule],
  controllers: [RaceController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
