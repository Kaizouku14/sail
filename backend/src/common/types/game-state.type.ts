export type GameStatus = 'IN_PROGRESS' | 'WON' | 'LOST';

export interface GuessRecord {
  word: string;
  results: string[];
}

export interface GameState {
  answer: string;
  guesses: GuessRecord[];
  status: GameStatus;
  date: string;
  maxGuesses: number;
}
