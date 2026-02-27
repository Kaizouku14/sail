import { SCORE_DIFFICULTY } from '@/common/constants/score-difficulty';
import { ScoreDifficultyType } from '@/common/types/score-difficulty.type';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly client: Groq;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
    this.model = this.configService.get<string>('GROQ_MODEL')!;
  }

  async generateHint(answer: string, guesses: string[]): Promise<string> {
    const prompt = this.buildPrompt(answer, guesses);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a helpful Wordle game assistant.
              Your job is to give semantic hints to help players
              guess the target word. You must NEVER reveal the
              word directly or use it in your hint.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 100, // hints should be short
        temperature: 0.7, // some creativity but not too random
      });

      const hint = response.choices[0]?.message?.content?.trim();

      if (!hint) {
        throw new Error('No hint generated');
      }

      // validate hint doesn't leak the answer
      if (!this.validateHint(hint, answer)) {
        this.logger.warn(`Hint leaked answer — regenerating`);
        return this.generateHint(answer, guesses); // retry once
      }

      return hint;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to generate hint: ${error.message}`);
      }
      throw new Error('Failed to generate hint');
    }
  }

  private buildPrompt(answer: string, guesses: string[]): string {
    const guessesText =
      guesses.length > 0
        ? `The player has guessed: ${guesses.join(', ')}.`
        : 'The player has not made any guesses yet.';

    return `
      The target word is "${answer}". ${guessesText}

      Generate ONE short semantic hint to help the player think of the word.

      Rules:
      1. NEVER include the word "${answer}" in your hint
      2. NEVER include direct synonyms of "${answer}"
      3. Do NOT mention specific letters
      4. Keep it to one sentence
      5. Make it conceptual — like "Think of something you'd find in a kitchen"

      Hint:
    `.trim();
  }

  validateHint(hint: string, answer: string): boolean {
    const hintLower = hint.toLowerCase();
    const answerLower = answer.toLowerCase();

    // check if hint contains the answer word
    return !hintLower.includes(answerLower);
  }

  async scoreDifficulty(word: string): Promise<ScoreDifficultyType> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a Wordle difficulty scorer.
              Respond with ONLY one word: easy, medium, or hard.`,
          },
          {
            role: 'user',
            content: `Rate the difficulty of this Wordle word: "${word}".
              Consider letter frequency, commonality, and tricky patterns.
              Respond with ONLY: easy, medium, or hard.`,
          },
        ],
        max_tokens: 10,
        temperature: 0.3, // low temperature for consistent scoring
      });

      const score = response.choices[0]?.message?.content
        ?.trim()
        .toLowerCase() as ScoreDifficultyType;

      if (
        score === SCORE_DIFFICULTY.EASY ||
        score === SCORE_DIFFICULTY.MEDIUM ||
        score === SCORE_DIFFICULTY.HARD
      ) {
        return score;
      }

      return 'medium';
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Failed to score difficulty: ${error.message}`);
      }
      return 'medium';
    }
  }
}
