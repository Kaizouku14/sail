import { cn, statusStyles } from "@/lib/utils";
import type { TileStatus } from "@/types/game.types";

interface TileProps {
  letter: string;
  status: TileStatus;
}

const Tile: React.FC<TileProps> = ({ letter, status }) => {
  const isRevealed =
    status === "CORRECT" || status === "PRESENT" || status === "ABSENT";
  const hasLetter = letter.length > 0;

  return (
    <div
      className={cn(
        "flex items-center justify-center border-2 text-2xl font-bold select-none aspect-square",
        "transition-transform duration-100",
        statusStyles[status],
        isRevealed && "animate-flip",
        hasLetter && status === "ACTIVE" && "animate-pop",
      )}
    >
      {letter}
    </div>
  );
};

export default Tile;
