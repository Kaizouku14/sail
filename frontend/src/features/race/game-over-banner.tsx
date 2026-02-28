import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface GameOverBannerProps {
  myStatus: "WON" | "LOST" | "PLAYING";
  answer: string | null;
  myGuessCount: number;
  opponentName: string | null;
  opponentStatus: string | null;
  timeExpired: boolean;
  rematchFrom: string | null;
  onRequestRematch: () => void;
  onAcceptRematch: () => void;
}

const GameOverBanner: React.FC<GameOverBannerProps> = ({
  myStatus,
  answer,
  myGuessCount,
  opponentName,
  opponentStatus,
  timeExpired,
  rematchFrom,
  onRequestRematch,
  onAcceptRematch,
}) => {
  const isWinner = myStatus === "WON";

  let description = "";
  if (timeExpired && myStatus !== "WON") {
    description = "Time ran out!";
  } else if (isWinner) {
    description = `You solved it in ${myGuessCount} ${myGuessCount === 1 ? "guess" : "guesses"}!`;
  } else if (myStatus === "LOST" && opponentStatus === "WON") {
    description = `${opponentName ?? "Opponent"} solved it first.`;
  } else {
    description = "Neither player solved it.";
  }

  if (answer) {
    description += ` The word was ${answer.toUpperCase()}.`;
  }

  return (
    <div
      className={`w-full rounded-base border-2 shadow-shadow p-4 text-center flex flex-col gap-3 ${
        isWinner
          ? "bg-chart-3/20 border-chart-3"
          : "bg-red-500/20 border-red-500"
      }`}
    >
      <div>
        <p className="text-lg font-heading">
          {timeExpired && myStatus !== "WON"
            ? "⏰ Time's up!"
            : isWinner
              ? "🎉 You won!"
              : "😔 Game over"}
        </p>
        <p className="text-sm opacity-80">{description}</p>
      </div>

      <div className="flex items-center justify-center gap-3">
        {rematchFrom ? (
          <Button
            size="sm"
            onClick={onAcceptRematch}
            className="flex items-center gap-2"
          >
            <RotateCcw className="size-4" />
            Accept rematch from {rematchFrom}
          </Button>
        ) : (
          <Button
            variant="neutral"
            size="sm"
            onClick={onRequestRematch}
            className="flex items-center gap-2"
          >
            <RotateCcw className="size-4" />
            Rematch
          </Button>
        )}
      </div>
    </div>
  );
};

export default GameOverBanner;
