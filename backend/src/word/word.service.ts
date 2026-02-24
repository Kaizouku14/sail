import { Injectable } from '@nestjs/common';
import LETTER_RESULT from 'src/common/constants/word.constants';
import LetterResult from 'src/common/types/letter-result.type';

@Injectable()
export class WordService {
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
