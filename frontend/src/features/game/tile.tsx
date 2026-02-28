import { cn, colorMap } from "@/lib/utils";
import type { TileStatus } from "@/types/game.types";

interface TileProps {
  letter: string;
  status: TileStatus;
}

const Tile: React.FC<TileProps> = ({ letter, status }) => {
  return (
    <div
      className={cn(
        "text-neutral-100 border-2 border-border flex justify-center items-center text-3xl",
        colorMap[status],
      )}
    >
      {letter}
    </div>
  );
};

export default Tile;
