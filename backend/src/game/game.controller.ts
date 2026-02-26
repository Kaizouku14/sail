import * as common from '@nestjs/common';
import { WordService } from 'src/word/word.service';
import { SubmitGuessDto } from './dto/submit-guess.dto';
import { GameService } from './game.service';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { GAME_STATUS } from '@/common/constants/game-status.constants';
import { AuthGuard } from '@/auth/auth.guard';
import { RateLimit, RateLimitGuard } from '@/common/guard/rate-limit.guard';

@common.Controller('game')
export class GameController {
  constructor(
    private readonly wordService: WordService,
    private readonly gameService: GameService,
  ) {}

  @common.Post('validate')
  validate(@common.Body() body: SubmitGuessDto) {
    const word = body.word.toLowerCase();
    const isValid = this.wordService.isValid(word);

    if (!isValid) {
      return { valid: false, message: 'Not a valid word' };
    }

    return { valid: true };
  }

  @common.Post('guess')
  @common.UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60)
  async guess(
    @common.Body() body: SubmitGuessDto,
    @common.Req() req: FastifyRequest,
    @common.Res() res: FastifyReply,
  ) {
    let sessionId = req.cookies['sessionId'];

    if (!sessionId) {
      sessionId = uuidv4();
      res.setCookie('sessionId', sessionId, {
        httpOnly: true, // not accessible via JavaScript
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
    }

    const result = await this.gameService.submitGuess(body.word, sessionId);

    return res.send(result);
  }

  @common.Get('state')
  @common.UseGuards(AuthGuard)
  async state(
    @common.Req() req: FastifyRequest,
    @common.Res() res: FastifyReply,
  ) {
    const sessionId = req.cookies['sessionId'];

    if (!sessionId) {
      return res.status(400).send({ error: 'No active game found' });
    }

    const state = await this.gameService.getGameState(sessionId);

    if (!state) {
      return res.status(404).send({ message: 'No active game found' });
    }

    return res.send({
      guesses: state.guesses,
      status: state.status,
      guessesRemaining: state.maxGuesses - state.guesses.length,
      answer:
        state.status === GAME_STATUS.IN_PROGRESS ? undefined : state.answer,
    });
  }
}
