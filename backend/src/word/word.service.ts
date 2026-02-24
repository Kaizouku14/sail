import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LETTER_RESULT } from 'src/common/constants/word.constants';
import LetterResult from 'src/common/types/letter-result.type';

@Injectable()
export class WordService implements OnModuleInit {
  private readonly logger = new Logger(WordService.name);
  private validWords: Set<string> = new Set();
  answerWords: string[] = [];

  onModuleInit() {
    this.loadWords();
  }

  private loadWords(): void {
    const answersPath = join(__dirname, 'data', 'answers.txt');
    const validPath = join(__dirname, 'data', 'words.txt');

    this.answerWords = readFileSync(answersPath, 'utf-8')
      .split('\n')
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean);

    const validGuesses = readFileSync(validPath, 'utf-8')
      .split('\n')
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean);

    this.validWords = new Set([...this.answerWords, ...validGuesses]);

    this.logger.log(
      `Loaded ${this.answerWords.length} answers and ${this.validWords.size} valid words`,
    );
  }

  isValid(word: string): boolean {
    return this.validWords.has(word.toLowerCase());
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
