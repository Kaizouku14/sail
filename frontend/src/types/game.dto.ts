import type { GameStatus } from "./game.types";

export interface BackendGuessRecord {
  word: string;
  results: string[];
}

export interface BackendGameState {
  guesses: BackendGuessRecord[];
  status: GameStatus;
  guessesRemaining: number;
  answer?: string;
}

export interface BackendGuessResponse {
  results: string[];
  status: GameStatus;
  guessesRemaining: number;
  answer?: string;
}

export interface BackendHintResponse {
  hint: string;
  hintsRemaining: number;
}
