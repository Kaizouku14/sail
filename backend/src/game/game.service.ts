import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LETTER_RESULT } from '@/common/constants/word.constants';
import { LetterResultType } from '@/common/types/letter-result.type';
import { WordService } from '@/word/word.service';
import { RedisService } from '@/redis/redis.service';
import { GameState, GameStatusType } from '@/common/types/game-state.type';
import { GAME_STATUS } from '@/common/constants/game-state.constants';
import { gameSessions, guesses } from '@/database/schema';
import { DatabaseService } from '@/database/database.service';
import { eq } from 'drizzle-orm';

@Injectable()
export class GameService {
  private readonly MAX_GUESSES = 6;
  private readonly SESSION_TTL = 60 * 60 * 24; // 24 hours

  constructor(
    private wordService: WordService,
    private redisService: RedisService,
    private database: DatabaseService,
  ) {}

  private getRedisKey(sessionId: string): string {
    return `game:${sessionId}`;
  }

  private getTodayUTC(): string {
    const today = new Date();
    return `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
  }

  async getOrCreateGameState(
    sessionId: string,
    userId: string,
  ): Promise<GameState> {
    const key = this.getRedisKey(sessionId);

    const existing = await this.redisService.get(key);

    if (existing) {
      const state = JSON.parse(existing) as GameState;

      if (state.date !== this.getTodayUTC()) {
        return await this.createNewGameState(sessionId, userId);
      }

      return state;
    }

    return await this.createNewGameState(sessionId, userId);
  }

  private async createNewGameState(
    sessionId: string,
    userId: string,
  ): Promise<GameState> {
    const state: GameState = {
      answer: this.getDailyWord(),
      guesses: [],
      status: GAME_STATUS.IN_PROGRESS as GameStatusType,
      date: this.getTodayUTC(),
      maxGuesses: this.MAX_GUESSES,
    };

    // Ensure there's a game_sessions row linked to the user
    await this.ensureSessionInDB(sessionId, userId);

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
    const results: LetterResultType[] = Array(5).fill(
      LETTER_RESULT.ABSENT,
    ) as LetterResultType[];
    const pool: (string | null)[] = answer.split('');

    for (let i = 0; i < 5; i++) {
      if (guess[i] === answer[i]) {
        results[i] = LETTER_RESULT.CORRECT as LetterResultType;
        pool[i] = null;
      }
    }

    for (let i = 0; i < 5; i++) {
      if (results[i] === LETTER_RESULT.CORRECT) continue;
      const idx = pool.indexOf(guess[i]);
      if (idx !== -1) {
        results[i] = LETTER_RESULT.PRESENT as LetterResultType;
        pool[idx] = null;
      }
    }

    return results;
  }

  async submitGuess(guess: string, sessionId: string, userId: string) {
    const state = await this.getOrCreateGameState(sessionId, userId);

    if (state.status === GAME_STATUS.WON || state.status === GAME_STATUS.LOST) {
      throw new HttpException('Game already finished', HttpStatus.BAD_REQUEST);
    }

    const isValid = this.wordService.isValid(guess);
    if (!isValid) {
      throw new HttpException('Invalid word', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const results = this.evaluateWord(guess, state.answer);
    state.guesses.push({ word: guess, results });

    // Persist individual guess to the guesses table
    await this.saveGuessToDB(sessionId, guess, results);

    const isWon = results.every((r) => r === LETTER_RESULT.CORRECT);
    let result: GameStatusType;
    if (isWon) {
      result = GAME_STATUS.WON as GameStatusType;
      state.status = result;
      await this.finalizeSession(sessionId, result, state.guesses.length);
    } else if (state.guesses.length === state.maxGuesses) {
      result = GAME_STATUS.LOST as GameStatusType;
      state.status = result;
      await this.finalizeSession(sessionId, result, state.guesses.length);
    }

    await this.saveGameState(sessionId, state);

    return {
      results,
      status: state.status,
      guessesRemaining: state.maxGuesses - state.guesses.length,
      answer: state.status === GAME_STATUS.LOST ? state.answer : undefined,
    };
  }

  /**
   * Create the game_sessions row when a new game starts, linking it to the user.
   * Uses onConflictDoNothing so we don't overwrite an existing session.
   */
  private async ensureSessionInDB(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    await this.database.db
      .insert(gameSessions)
      .values({
        sessionId,
        userId,
        wordDate: new Date().toISOString().split('T')[0],
        status: GAME_STATUS.IN_PROGRESS as GameStatusType,
      })
      .onConflictDoNothing({ target: gameSessions.sessionId });
  }

  /**
   * Update the session with the final status and guess count when the game ends.
   */
  private async finalizeSession(
    sessionId: string,
    status: GameStatusType,
    guessCount: number,
  ): Promise<void> {
    await this.database.db
      .update(gameSessions)
      .set({ status, guessCount, completedAt: new Date() })
      .where(eq(gameSessions.sessionId, sessionId));
  }

  /**
   * Persist an individual guess to the guesses table.
   * Looks up the game_sessions row by sessionId to get the FK id.
   */
  private async saveGuessToDB(
    sessionId: string,
    word: string,
    results: LetterResultType[],
  ): Promise<void> {
    const [session] = await this.database.db
      .select({ id: gameSessions.id })
      .from(gameSessions)
      .where(eq(gameSessions.sessionId, sessionId))
      .limit(1);

    if (!session) return;

    await this.database.db.insert(guesses).values({
      sessionId: session.id,
      word,
      results,
    });
  }
}
