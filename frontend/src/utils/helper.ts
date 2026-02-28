import type { BackendGuessRecord } from "@/types/game.dto";
import type { Guess, TileStatus } from "@/types/game.types";

export function toFrontendGuess(record: BackendGuessRecord): Guess {
  const letters = record.word.split("");

  return {
    word: record.word,
    results: letters.map((letter, i) => ({
      letter,
      status: (record.results[i] ?? "ABSENT") as TileStatus,
    })),
  };
}

export function guessResponseToGuess(word: string, results: string[]): Guess {
  const letters = word.split("");

  return {
    word,
    results: letters.map((letter, i) => ({
      letter,
      status: (results[i] ?? "ABSENT") as TileStatus,
    })),
  };
}
