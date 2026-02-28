import { create } from "zustand";
import {
  GAME_STATUS,
  MAX_GUESSES,
  TILE_STATUS,
  WORD_LENGTH,
} from "@/utils/constants";
import type { GameStatus, Guess, TileStatus } from "@/types/game.types";

interface GameStore {
  guesses: Guess[];
  currentGuess: string;
  status: GameStatus;
  answer: string | null;
  guessesRemaining: number;
  keyboardColors: Record<string, TileStatus>;
  hint: string | null;
  hintsRemaining: number;
  isLoading: boolean;
  error: string | null;

  // actions
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => void;
  setGuessResult: (guess: Guess) => void;
  setGameStatus: (status: GameStatus, answer?: string) => void;
  setHint: (hint: string, hintsRemaining: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetGame: () => void;
}

const initialState = {
  guesses: [],
  currentGuess: "",
  status: GAME_STATUS.IN_PROGRESS as GameStatus,
  answer: null,
  guessesRemaining: MAX_GUESSES,
  keyboardColors: {} as Record<string, TileStatus>,
  hint: null,
  hintsRemaining: 3,
  isLoading: false,
  error: null,
};

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,

  addLetter: (letter) => {
    const { currentGuess, status } = get();
    if (status !== GAME_STATUS.IN_PROGRESS) return;
    if (currentGuess.length >= WORD_LENGTH) return;
    set({ currentGuess: currentGuess + letter.toLowerCase(), error: null });
  },

  removeLetter: () => {
    const { currentGuess } = get();
    if (currentGuess.length === 0) return;
    set({ currentGuess: currentGuess.slice(0, -1) });
  },

  submitGuess: () => {
    // triggers the actual API call in useGame hook
    // store just tracks loading state
    set({ isLoading: true, error: null });
  },

  setGuessResult: (guess) => {
    const { guesses, keyboardColors } = get();

    const newKeyboardColors = { ...keyboardColors };
    guess.results.forEach(({ letter, status }) => {
      const current = newKeyboardColors[letter];
      // priority: CORRECT > PRESENT > ABSENT
      if (current === TILE_STATUS.CORRECT) return;
      if (current === TILE_STATUS.PRESENT && status !== TILE_STATUS.CORRECT)
        return;
      newKeyboardColors[letter] = status;
    });

    set({
      guesses: [...guesses, guess],
      currentGuess: "",
      keyboardColors: newKeyboardColors,
      guessesRemaining: MAX_GUESSES - guesses.length - 1,
      isLoading: false,
    });
  },

  setGameStatus: (status, answer) => {
    set({ status, answer: answer ?? null });
  },

  setHint: (hint, hintsRemaining) => {
    set({ hint, hintsRemaining });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error, isLoading: false });
  },

  resetGame: () => {
    set(initialState);
  },
}));
