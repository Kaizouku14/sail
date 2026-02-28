import { useMemo } from "react";
import { MAX_GUESSES, WORD_LENGTH } from "@/utils/constants";
import type { Guess, TileStatus } from "@/types/game.types";

export interface BoardTile {
  letter: string;
  status: TileStatus;
}

export function useBoardRows(
  guesses: Guess[],
  currentGuess: string,
  isActive: boolean,
): BoardTile[][] {
  return useMemo(() => {
    const rows: BoardTile[][] = [];

    for (const guess of guesses) {
      rows.push(
        guess.results.map((r) => ({
          letter: r.letter.toUpperCase(),
          status: r.status,
        })),
      );
    }

    if (rows.length < MAX_GUESSES && isActive) {
      const currentRow: BoardTile[] = [];
      for (let i = 0; i < WORD_LENGTH; i++) {
        if (i < currentGuess.length) {
          currentRow.push({
            letter: currentGuess[i].toUpperCase(),
            status: "ACTIVE",
          });
        } else {
          currentRow.push({ letter: "", status: "EMPTY" });
        }
      }
      rows.push(currentRow);
    }

    while (rows.length < MAX_GUESSES) {
      rows.push(
        Array.from({ length: WORD_LENGTH }, () => ({
          letter: "",
          status: "EMPTY" as TileStatus,
        })),
      );
    }

    return rows;
  }, [guesses, currentGuess, isActive]);
}
