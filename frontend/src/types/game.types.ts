export type TileStatus = "CORRECT" | "PRESENT" | "ABSENT" | "EMPTY" | "ACTIVE";
export type GameStatus = "IN_PROGRESS" | "WON" | "LOST";

export interface LetterResult {
  letter: string;
  status: TileStatus;
}

export interface Guess {
  word: string;
  results: LetterResult[];
}

export interface GameState {
  guesses: Guess[];
  status: GameStatus;
  guessesRemaining: number;
  answer?: string; // only present when game ends
}
