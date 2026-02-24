import * as common from '@nestjs/common';
import { GameService } from './game.service';

@common.Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}
}
