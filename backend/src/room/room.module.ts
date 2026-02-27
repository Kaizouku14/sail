import { Module, forwardRef } from '@nestjs/common';
import { RoomService } from './room.service';
import { GameModule } from '@/game/game.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [forwardRef(() => GameModule), AuthModule],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
