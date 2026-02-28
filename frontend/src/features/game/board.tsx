import { useGameStore } from "@/store";
import Tile from "./tile";
import { MAX_GUESSES, WORD_LENGTH } from "@/utils/constants";
import type { TileStatus } from "@/types/game.types";

const Board = () => {
  const { guesses, currentGuess, status } = useGameStore();

  const rows: { letter: string; status: TileStatus }[][] = [];

  // Submitted guesses
  for (const guess of guesses) {
    const row = guess.results.map((r) => ({
      letter: r.letter.toUpperCase(),
      status: r.status,
    }));
    rows.push(row);
  }

  // Current in-progress row (only if game is still going)
  if (rows.length < MAX_GUESSES && status === "IN_PROGRESS") {
    const currentRow: { letter: string; status: TileStatus }[] = [];
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

  // Fill remaining empty rows
  while (rows.length < MAX_GUESSES) {
    const emptyRow: { letter: string; status: TileStatus }[] = Array.from(
      { length: WORD_LENGTH },
      () => ({
        letter: "",
        status: "EMPTY" as TileStatus,
      }),
    );
    rows.push(emptyRow);
  }

  return (
    <div className="grid grid-rows-6 max-w-sm mx-auto h-105 w-full gap-1.5">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-5 gap-1.5">
          {row.map((tile, colIndex) => (
            <Tile key={colIndex} status={tile.status} letter={tile.letter} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default Board;
