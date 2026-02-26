import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GameService } from './game.service';
import { WordService } from '@/word/word.service';
import { RedisService } from '@/redis/redis.service';
import { GAME_STATUS } from '@/common/constants/game-status.constants';
import { LETTER_RESULT } from '@/common/constants/word.constants';
import { GameState } from '@/common/types/game-state.type';

const mockWordService = {
  isValid: jest.fn(),
  getAnswerWords: jest.fn(),
};

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('GameService', () => {
  let service: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: WordService, useValue: mockWordService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<GameService>(GameService);

    jest.clearAllMocks();
    mockRedisService.set.mockResolvedValue(undefined);
  });

  const sessionId = 'test-session-id';
  const answer = 'apple';

  function makeGameState(overrides: Partial<GameState> = {}): GameState {
    return {
      answer,
      guesses: [],
      status: GAME_STATUS.IN_PROGRESS as GameState['status'],
      date: service['getTodayUTC'](),
      maxGuesses: 6,
      ...overrides,
    };
  }

  describe('submitGuess()', () => {
    it('should return results for a valid guess', async () => {
      const state = makeGameState();
      mockRedisService.get.mockResolvedValue(JSON.stringify(state));
      mockWordService.isValid.mockReturnValue(true);

      const result = await service.submitGuess('arise', sessionId);

      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(5);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('guessesRemaining');
      result.results.forEach((r: string) => {
        expect([
          LETTER_RESULT.CORRECT,
          LETTER_RESULT.PRESENT,
          LETTER_RESULT.ABSENT,
        ]).toContain(r);
      });
    });

    it('should throw 400 if game is already WON', async () => {
      const state = makeGameState({
        status: GAME_STATUS.WON as GameState['status'],
        guesses: [
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          { word: answer, results: Array(5).fill(LETTER_RESULT.CORRECT) },
        ],
      });
      mockRedisService.get.mockResolvedValue(JSON.stringify(state));

      await expect(service.submitGuess('arise', sessionId)).rejects.toThrow(
        new HttpException('Game already finished', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw 400 if game is already LOST', async () => {
      const state = makeGameState({
        status: GAME_STATUS.LOST as GameState['status'],
        guesses: Array(6).fill({
          word: 'wrong',
          results: Array(5).fill(LETTER_RESULT.ABSENT),
        }),
      });
      mockRedisService.get.mockResolvedValue(JSON.stringify(state));

      await expect(service.submitGuess('arise', sessionId)).rejects.toThrow(
        new HttpException('Game already finished', HttpStatus.BAD_REQUEST),
      );
    });

    it('should throw 422 if word is not in dictionary', async () => {
      const state = makeGameState();
      mockRedisService.get.mockResolvedValue(JSON.stringify(state));
      mockWordService.isValid.mockReturnValue(false);

      await expect(service.submitGuess('zzzzz', sessionId)).rejects.toThrow(
        new HttpException('Invalid word', HttpStatus.UNPROCESSABLE_ENTITY),
      );
    });

    it('should return WON status when all letters correct', async () => {
      const state = makeGameState();
      mockRedisService.get.mockResolvedValue(JSON.stringify(state));
      mockWordService.isValid.mockReturnValue(true);

      const result = await service.submitGuess(answer, sessionId);

      expect(result.status).toBe(GAME_STATUS.WON);
      expect(result.results).toEqual(Array(5).fill(LETTER_RESULT.CORRECT));
    });

    it('should return LOST status after 6 wrong guesses', async () => {
      const state = makeGameState({
        guesses: Array(5).fill({
          word: 'wrong',
          results: Array(5).fill(LETTER_RESULT.ABSENT),
        }),
      });
      mockRedisService.get.mockResolvedValue(JSON.stringify(state));
      mockWordService.isValid.mockReturnValue(true);

      const result = await service.submitGuess('crane', sessionId);

      expect(result.status).toBe(GAME_STATUS.LOST);
      expect(result.guessesRemaining).toBe(0);
    });

    it('should return answer when game is LOST', async () => {
      const state = makeGameState({
        guesses: Array(5).fill({
          word: 'wrong',
          results: Array(5).fill(LETTER_RESULT.ABSENT),
        }),
      });
      mockRedisService.get.mockResolvedValue(JSON.stringify(state));
      mockWordService.isValid.mockReturnValue(true);

      const result = await service.submitGuess('crane', sessionId);

      expect(result.status).toBe(GAME_STATUS.LOST);
      expect(result.answer).toBe(answer);
    });
  });

  describe('getGameState()', () => {
    it('should return null if no game exists', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getGameState(sessionId);

      expect(result).toBeNull();
    });

    it('should return current game state if exists', async () => {
      const state = makeGameState({
        guesses: [
          {
            word: 'crane',
            results: [
              LETTER_RESULT.ABSENT,
              LETTER_RESULT.ABSENT,
              LETTER_RESULT.PRESENT,
              LETTER_RESULT.ABSENT,
              LETTER_RESULT.PRESENT,
            ],
          },
        ],
      });
      mockRedisService.get.mockResolvedValue(JSON.stringify(state));

      const result = await service.getGameState(sessionId);

      expect(result).toEqual(state);
    });
  });
});
