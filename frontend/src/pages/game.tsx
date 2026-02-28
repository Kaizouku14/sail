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
    <div className="flex flex-col items-center gap-6 w-full h-full">
      {/* Game over banner */}
      {isGameOver && (
        <div className="w-full max-w-sm mx-auto">
          <div
            className={`rounded-base border-2 border-border shadow-shadow p-4 text-center ${
              status === GAME_STATUS.WON
                ? "bg-chart-3/20 border-chart-3"
                : "bg-red-500/20 border-red-500"
            }`}
          >
            {status === GAME_STATUS.WON ? (
              <>
                <p className="text-lg font-heading">🎉 You won!</p>
                <p className="text-sm opacity-80">
                  Solved in {guesses.length}{" "}
                  {guesses.length === 1 ? "guess" : "guesses"}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-heading">😔 Game over</p>
                <p className="text-sm opacity-80">
                  The word was{" "}
                  <span className="font-bold uppercase">{answer}</span>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <Board />

      <div className="flex items-center justify-center gap-3">
        {!isGameOver && isAuthenticated && (
          <Button
            variant="neutral"
            size="sm"
            onClick={requestHint}
            disabled={isLoading || hintsRemaining <= 0}
            className="flex items-center gap-2"
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
            className="flex items-center gap-2"
          >
            <RotateCcw className="size-4" />
            New Game
          </Button>
        )}
      </div>

      <KeyBoard
        onKeyPress={handleKeyPress}
        keyboardColors={keyboardColors}
        disabled={isGameOver || isLoading}
      />
    </div>
  );
};

export default Game;
