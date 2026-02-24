import { Injectable } from '@nestjs/common';
import { LETTER_RESULT } from '@/common/constants/word.constants';
import LetterResult from '@/common/types/letter-result.type';
import { WordService } from '@/word/word.service';

@Injectable()
export class GameService {
  constructor(private wordService: WordService) {}

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
}
