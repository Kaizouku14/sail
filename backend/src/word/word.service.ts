import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

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

  getAnswerWords(): string[] {
    return this.answerWords;
  }
}
