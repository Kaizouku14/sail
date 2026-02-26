import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LETTER_RESULT } from '@/common/constants/word.constants';
import LetterResult from '@/common/types/letter-result.type';
import { WordService } from '@/word/word.service';
import { RedisService } from '@/redis/redis.service';
import { GameState, GameStatusType } from '@/common/types/game-state.type';
import { GAME_STATUS } from '@/common/constants/game-state.constants';

@Injectable()
export class GameService {
  private readonly MAX_GUESSES = 6;
  private readonly SESSION_TTL = 60 * 60 * 24; // 24 hours

  constructor(
    private wordService: WordService,
    private redisService: RedisService,
  ) {}

  private getRedisKey(sessionId: string): string {
    return `game:${sessionId}`;
  }

  private getTodayUTC(): string {
    const today = new Date();
    return `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
  }

  async getOrCreateGameState(sessionId: string): Promise<GameState> {
    const key = this.getRedisKey(sessionId);

    const existing = await this.redisService.get(key);

    if (existing) {
      const state = JSON.parse(existing) as GameState;

      if (state.date !== this.getTodayUTC()) {
        return await this.createNewGameState(sessionId);
      }

      return state;
    }

    return await this.createNewGameState(sessionId);
  }

  private async createNewGameState(sessionId: string): Promise<GameState> {
    const state: GameState = {
      answer: this.getDailyWord(),
      guesses: [],
      status: GAME_STATUS.IN_PROGRESS as GameStatusType,
      date: this.getTodayUTC(),
      maxGuesses: this.MAX_GUESSES,
    };

    await this.saveGameState(sessionId, state);
    return state;
  }

  async saveGameState(sessionId: string, state: GameState): Promise<void> {
    const key = this.getRedisKey(sessionId);
    await this.redisService.set(key, JSON.stringify(state), this.SESSION_TTL);
  }

  async getGameState(sessionId: string): Promise<GameState | null> {
    const key = this.getRedisKey(sessionId);
    const existing = await this.redisService.get(key);
    return existing ? (JSON.parse(existing) as GameState) : null;
  }

  getDailyWord(): string {
    const words = this.wordService.getAnswerWords();
    const epoch = new Date('2026-01-01').getTime();
    const today = new Date();
    const utcToday = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );
    const dayIndex = Math.floor((utcToday - epoch) / 86_400_000) % words.length;

    return words[dayIndex];
  }

  evaluateWord(guess: string, answer: string) {
    const results: LetterResult[] = Array(5).fill(
      LETTER_RESULT.ABSENT,
    ) as LetterResult[];
    const pool: (string | null)[] = answer.split('');

    for (let i = 0; i < 5; i++) {
      if (guess[i] === answer[i]) {
        results[i] = LETTER_RESULT.CORRECT as LetterResult;
        pool[i] = null;
      }
    }

    for (let i = 0; i < 5; i++) {
      if (results[i] === LETTER_RESULT.CORRECT) continue;
      const idx = pool.indexOf(guess[i]);
      if (idx !== -1) {
        results[i] = LETTER_RESULT.PRESENT as LetterResult;
        pool[idx] = null;
      }
    }

    return results;
  }

  async submitGuess(guess: string, sessionId: string) {
    const state = await this.getOrCreateGameState(sessionId);

    if (state.status === GAME_STATUS.WON || state.status === GAME_STATUS.LOST) {
      throw new HttpException('Game already finished', HttpStatus.BAD_REQUEST);
    }

    const isValid = this.wordService.isValid(guess);
    if (!isValid) {
      throw new HttpException('Invalid word', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const results = this.evaluateWord(guess, state.answer);
    state.guesses.push({ word: guess, results });

    const isWon = results.every((r) => r === LETTER_RESULT.CORRECT);
    if (isWon) {
      state.status = GAME_STATUS.WON as GameStatusType;
    } else if (state.guesses.length === state.maxGuesses) {
      state.status = GAME_STATUS.LOST as GameStatusType;
    }

    await this.saveGameState(sessionId, state);

    return {
      results,
      status: state.status,
      guessesRemaining: state.maxGuesses - state.guesses.length,
      answer: state.status === GAME_STATUS.LOST ? state.answer : undefined,
    };
  }
}
