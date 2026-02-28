import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RoomService } from './room.service';
import { AuthGuard } from '@/auth/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/types/jwt-payload.type';

@Controller('race')
export class RaceController {
  constructor(private readonly room: RoomService) {}

  @Get('room/:id')
  @UseGuards(AuthGuard)
  async getRoomById(
    @Param('id') roomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const room = await this.room.getRoomState(roomId);

    if (!room) {
      return { room: null };
    }

    // Only allow players in the room to view it
    const isPlayer = room.players.some((p) => p.id === user.id);
    if (!isPlayer) {
      return { room: null };
    }

    return { room: this.room.getPublicRoomState(room) };
  }

  @Get('history')
  @UseGuards(AuthGuard)
  async getRaceHistory(@CurrentUser() user: JwtPayload) {
    const history = await this.room.getRaceHistory(user.id);

    return {
      matches: history.map((h) => ({
        roomId: h.roomId,
        playerStatus: h.status,
        guessCount: h.guessCount,
        roomStatus: h.roomStatus,
        createdAt: h.createdAt,
        finishedAt: h.finishedAt,
      })),
    };
  }

  @Get('stats')
  @UseGuards(AuthGuard)
  async getRaceStats(@CurrentUser() user: JwtPayload) {
    return this.room.getRaceStats(user.id);
  }

  @Get('active')
  @UseGuards(AuthGuard)
  async getActiveRoom(@CurrentUser() user: JwtPayload) {
    const room = await this.room.getUserActiveRoom(user.id);

    if (!room) {
      return { room: null };
    }

    return { room: this.room.getPublicRoomState(room) };
  }
}
