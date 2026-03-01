import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface GameOverBannerProps {
  myStatus: "WON" | "LOST" | "PLAYING";
  answer: string | null;
  myGuessCount: number;
  opponentName: string | null;
  opponentStatus: string | null;
  opponentGuessCount: number;
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
  opponentGuessCount,
  timeExpired,
  rematchFrom,
  onRequestRematch,
  onAcceptRematch,
}) => {
  const isWinner = myStatus === "WON";
  const opponent = opponentName ?? "Opponent";

  // Did the opponent exhaust all their guesses?
  const opponentExhausted =
    opponentStatus === "LOST" && opponentGuessCount >= 6;
  // Did I exhaust all my guesses?
  const iExhausted = myStatus === "LOST" && myGuessCount >= 6;
  // Did the opponent actually solve it?
  const opponentSolvedIt = opponentStatus === "WON" && !opponentExhausted;

  let title = "";
  let description = "";

  if (timeExpired && myStatus !== "WON") {
    title = "Time's up!";
    description = "Time ran out!";
  } else if (isWinner && opponentExhausted) {
    // I won because the opponent used all 6 guesses
    title = "You won!";
    description = `${opponent} used all 6 guesses — you win!`;
  } else if (isWinner) {
    // I solved it
    title = "You won!";
    description = `You solved it in ${myGuessCount} ${myGuessCount === 1 ? "guess" : "guesses"}!`;
  } else if (iExhausted && opponentSolvedIt) {
    // I lost by exhausting guesses, and the opponent actually solved it
    title = "Game over";
    description = `You used all 6 guesses. ${opponent} solved it in ${opponentGuessCount} ${opponentGuessCount === 1 ? "guess" : "guesses"}.`;
  } else if (iExhausted) {
    // I lost by exhausting guesses
    title = "Game over";
    description = `You used all 6 guesses.`;
  } else if (myStatus === "LOST" && opponentSolvedIt) {
    // Opponent solved it while I was still playing
    title = "Game over";
    description = `${opponent} solved it in ${opponentGuessCount} ${opponentGuessCount === 1 ? "guess" : "guesses"}.`;
  } else if (myStatus === "LOST") {
    title = "Game over";
    description = "Better luck next time!";
  } else {
    title = "Game over";
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
        <p className="text-lg font-heading">{title}</p>
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
