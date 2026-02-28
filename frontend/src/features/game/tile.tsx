import { cn } from "@/lib/utils";
import type { TileStatus } from "@/types/game.types";

interface TileProps {
  letter: string;
  status: TileStatus;
}

const statusStyles: Record<TileStatus, string> = {
  CORRECT: "bg-chart-3 border-chart-3 text-neutral-100",
  PRESENT: "bg-chart-2 border-chart-2 text-neutral-100",
  ABSENT:
    "bg-secondary-background border-secondary-background text-neutral-100",
  ACTIVE: "bg-transparent border-foreground text-foreground",
  EMPTY: "bg-transparent border-border/40 text-transparent",
};

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
