import { Board, KeyBoard, useGame } from "@/features/game";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Lightbulb, RotateCcw } from "lucide-react";
import { GAME_STATUS } from "@/utils/constants";

const Game = () => {
  const {
    status,
    answer,
    guesses,
    keyboardColors,
    isLoading,
    hintsRemaining,
    handleKeyPress,
    requestHint,
    resetGame,
  } = useGame();

  const { isAuthenticated } = useAuthStore();

  const isGameOver = status === GAME_STATUS.WON || status === GAME_STATUS.LOST;

  return (
    <div className="flex flex-col items-center w-full h-full gap-2 sm:gap-3 overflow-hidden">
      {/* Game over banner */}
      {isGameOver && (
        <div className="w-full max-w-sm mx-auto px-1 shrink-0">
          <div
            className={`rounded-base border-2 border-border shadow-shadow p-3 sm:p-4 text-center ${
              status === GAME_STATUS.WON
                ? "bg-chart-3/20 border-chart-3"
                : "bg-red-500/20 border-red-500"
            }`}
          >
            {status === GAME_STATUS.WON ? (
              <>
                <p className="text-base sm:text-lg font-heading">You won!</p>
                <p className="text-xs sm:text-sm opacity-80">
                  Solved in {guesses.length}{" "}
                  {guesses.length === 1 ? "guess" : "guesses"}
                </p>
              </>
            ) : (
              <>
                <p className="text-base sm:text-lg font-heading">Game over</p>
                <p className="text-xs sm:text-sm opacity-80">
                  The word was{" "}
                  <span className="font-bold uppercase">{answer}</span>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Board — takes remaining vertical space between banner and keyboard */}
      <div className="flex-1 w-full min-h-0 px-4 sm:px-0">
        <Board />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3 shrink-0">
        {!isGameOver && isAuthenticated && (
          <Button
            variant="neutral"
            size="sm"
            onClick={requestHint}
            disabled={isLoading || hintsRemaining <= 0}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Lightbulb className="size-4" />
            Hint ({hintsRemaining})
          </Button>
        )}

        {isGameOver && (
          <Button
            variant="neutral"
            size="sm"
            onClick={resetGame}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <RotateCcw className="size-4" />
            New Game
          </Button>
        )}
      </div>

      {/* Keyboard — pinned to bottom */}
      <div className="w-full shrink-0 pb-1 sm:pb-2">
        <KeyBoard
          onKeyPress={handleKeyPress}
          keyboardColors={keyboardColors}
          disabled={isGameOver || isLoading}
        />
      </div>
    </div>
  );
};

export default Game;
