import { Trophy, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RaceMatch } from "@/types/auth.types";

interface RaceMatchRowProps {
  match: RaceMatch;
}

const RaceMatchRow = ({ match }: RaceMatchRowProps) => {
  const isWon = match.playerStatus === "WON";
  const isFinished = match.roomStatus === "FINISHED";

  return (
    <div className="flex items-center justify-between rounded-base border-2 border-border px-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "shrink-0 rounded-base border p-1.5",
            isWon
              ? "border-chart-3/40 bg-chart-3/10 text-chart-3"
              : "border-red-500/40 bg-red-500/10 text-red-400",
          )}
        >
          {isWon ? (
            <Trophy className="size-3.5" />
          ) : (
            <XCircle className="size-3.5" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-heading">
            {isWon ? "Won" : "Lost"}
            {match.guessCount > 0 && (
              <span className="text-xs font-base opacity-60 ml-1.5">
                {match.guessCount}/6 guesses
              </span>
            )}
          </span>
          <span className="text-xs opacity-50 truncate">
            {match.roomId.slice(0, 8)}...
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isFinished && (
          <span className="text-xs opacity-40 italic">In progress</span>
        )}
        {match.finishedAt && (
          <span className="text-xs opacity-40">
            {new Date(match.finishedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default RaceMatchRow;
