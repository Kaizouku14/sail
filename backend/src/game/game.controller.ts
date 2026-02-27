import { WordService } from 'src/word/word.service';
import { GameService } from './game.service';
import { AIService } from '@/ai/ai.service';
import { SubmitGuessDto } from './dto/submit-guess.dto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { AuthGuard } from '@/auth/auth.guard';
import { RateLimit, RateLimitGuard } from '@/common/guard/rate-limit.guard';
import { GAME_STATUS } from '@/common/constants/game-state.constants';
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/types/jwt-payload.type';
import { RedisService } from '@/redis/redis.service';

@Controller('game')
export class GameController {
  constructor(
    private readonly wordService: WordService,
    private readonly gameService: GameService,
    private readonly ai: AIService,
    private readonly redis: RedisService,
  ) {}

  @Post('validate')
  validate(@Body() body: SubmitGuessDto) {
    const word = body.word.toLowerCase();
    const isValid = this.wordService.isValid(word);

    if (!isValid) {
      return { valid: false, message: 'Not a valid word' };
    }

    return { valid: true };
  }

  @Post('guess')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(10, 60)
  async guess(
    @Body() body: SubmitGuessDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    let sessionId = req.cookies['sessionId'];

    if (!sessionId) {
      sessionId = uuidv4();
      res.setCookie('sessionId', sessionId, {
        httpOnly: true,
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
    }

    const result = await this.gameService.submitGuess(
      body.word,
      sessionId,
      user.id,
    );

    return res.send(result);
  }

  @Get('state')
  @UseGuards(AuthGuard)
  async state(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
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

  @Get('hint')
  @UseGuards(AuthGuard)
  async getHint(@CurrentUser() user: JwtPayload, @Req() req: FastifyRequest) {
    const sessionId = req.cookies['sessionId'] ?? user.id;

    const state = await this.gameService.getGameState(sessionId);
    if (!state) {
      throw new HttpException('No active game', HttpStatus.NOT_FOUND);
    }

    if (state.status !== GAME_STATUS.IN_PROGRESS) {
      throw new HttpException('Game is already over', HttpStatus.BAD_REQUEST);
    }

    // check hint limit — max 3 per game
    const hintKey = `hints:${sessionId}`;
    const hintCount = await this.redis.get(hintKey);
    const count = hintCount ? parseInt(hintCount) : 0;

    if (count >= 3) {
      throw new HttpException(
        'Hint limit reached (max 3 per game)',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.redis.set(hintKey, String(count + 1), 60 * 60 * 24);

    const guesses = state.guesses.map((g) => g.word);
    const hint = await this.ai.generateHint(state.answer, guesses);

    return {
      hint,
      hintsRemaining: 3 - (count + 1),
    };
  }
}
