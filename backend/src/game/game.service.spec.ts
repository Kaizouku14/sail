import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { WordService } from '../word/word.service';

describe('GameService', () => {
  let gameService: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: WordService,
          useValue: {
            // mock — no real file loading in tests
            getAnswerWords: () => ['crane', 'slate', 'audio', 'raise', 'light'],
            isValid: (word: string) =>
              ['crane', 'slate', 'audio'].includes(word),
          },
        },
      ],
    }).compile();

    gameService = module.get<GameService>(GameService);
  });

  // evaluateWord tests
  describe('evaluateWord', () => {
    it('marks all correct when guess equals answer', () => {
      const result = gameService.evaluateWord('crane', 'crane');
      expect(result).toEqual([
        'CORRECT',
        'CORRECT',
        'CORRECT',
        'CORRECT',
        'CORRECT',
      ]);
    });

    it('marks all absent when no letters match', () => {
      const result = gameService.evaluateWord('light', 'crane');
      expect(result.every((r) => r === 'ABSENT')).toBe(true);
    });

    it('handles duplicate letters correctly', () => {
      const result = gameService.evaluateWord('speed', 'spell');
      expect(result[0]).toBe('CORRECT'); // s matches s
      expect(result[1]).toBe('CORRECT'); // p matches p
      expect(result[2]).toBe('CORRECT'); // e matches e ← was wrong, should be CORRECT
      expect(result[3]).toBe('ABSENT'); // second e, no e left in pool
      expect(result[4]).toBe('ABSENT'); // d not in answer
    });

    it('marks present when letter exists but wrong position', () => {
      const result = gameService.evaluateWord('acorn', 'crane');
      expect(result[0]).toBe('PRESENT'); // a is in crane
      expect(result[1]).toBe('PRESENT'); // c is in crane
    });
  });

  // getDailyWord tests
  describe('getDailyWord', () => {
    it('returns a word from the answer list', () => {
      const word = gameService.getDailyWord();
      const answerWords = ['crane', 'slate', 'audio', 'raise', 'light'];
      expect(answerWords).toContain(word);
    });

    it('returns the same word when called twice on the same day', () => {
      expect(gameService.getDailyWord()).toBe(gameService.getDailyWord());
    });
  });
});
