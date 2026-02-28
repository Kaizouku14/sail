import Tile from "./tile";
import type { Guess } from "@/types/game.types";
import { useGameStore } from "@/store";
import { useBoardRows } from "@/hooks/use-board-rows";

interface BoardProps {
  guesses?: Guess[];
  currentGuess?: string;
  isActive?: boolean;
}

const Board: React.FC<BoardProps> = ({
  guesses: externalGuesses,
  currentGuess: externalCurrentGuess,
  isActive: externalIsActive,
}) => {
  const storeGuesses = useGameStore((s) => s.guesses);
  const storeCurrentGuess = useGameStore((s) => s.currentGuess);
  const storeStatus = useGameStore((s) => s.status);

  const guesses = externalGuesses ?? storeGuesses;
  const currentGuess = externalCurrentGuess ?? storeCurrentGuess;
  const isActive = externalIsActive ?? storeStatus === "IN_PROGRESS";

  const rows = useBoardRows(guesses, currentGuess, isActive);

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
