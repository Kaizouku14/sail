import { cn, statusStyles } from "@/lib/utils";
import { MAX_GUESSES, WORD_LENGTH } from "@/utils/constants";
import type { PlayerStatus } from "@/types/socket.types";
import { Trophy, XCircle, Loader2 } from "lucide-react";

interface OpponentBoardProps {
  username: string;
  guessColors: string[][];
  status: PlayerStatus;
  guessCount: number;
}

const statusDisplay: Record<
  PlayerStatus,
  { label: string; className: string; icon: React.ReactNode } | null
> = {
  PLAYING: null,
  WON: {
    label: "Won",
    className: "text-chart-3",
    icon: <Trophy className="size-3.5" />,
  },
  LOST: {
    label: "Lost",
    className: "text-red-400",
    icon: <XCircle className="size-3.5" />,
  },
};

const OpponentBoard: React.FC<OpponentBoardProps> = ({
  username,
  guessColors,
  status,
  guessCount,
}) => {
  const badge = statusDisplay[status];

  return (
    <div className="flex flex-col gap-3 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm font-heading truncate max-w-30">
          {username}
        </span>

        {badge ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-heading",
              badge.className,
            )}
          >
            {badge.icon}
            {badge.label}
          </span>
        ) : (
          guessCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs opacity-50">
              <Loader2 className="size-3 animate-spin" />
              {guessCount}/6
            </span>
          )
        )}
      </div>

      <div className="flex flex-col gap-1">
        {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => {
          const hasRow = rowIndex < guessColors.length;

          return (
            <div key={rowIndex} className="flex gap-1">
              {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
                const color = guessColors[rowIndex]?.[colIndex];

                return (
                  <div
                    key={colIndex}
                    className={cn(
                      "h-5 w-5 sm:h-7 sm:w-7 rounded-sm border-2 transition-colors duration-300",
                      hasRow && color
                        ? cn(
                            statusStyles[color as keyof typeof statusStyles],
                            "border-transparent",
                          )
                        : "border-border/30 bg-transparent",
                      hasRow && "animate-flip",
                    )}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OpponentBoard;
