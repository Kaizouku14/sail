import { GameStatus } from '../constants/game-state.constants';

export type GameStatusType = (typeof GameStatus)[number];

export interface GuessRecord {
  word: string;
  results: string[];
}

export interface GameState {
  answer: string;
  guesses: GuessRecord[];
  status: GameStatusType;
  date: string;
  maxGuesses: number;
}
