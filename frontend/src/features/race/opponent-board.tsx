import { cn, colorMap } from "@/lib/utils";
import { MAX_GUESSES, WORD_LENGTH } from "@/utils/constants";

interface OpponentBoardProps {
  username: string;
  guessColors: string[][];
}

const OpponentBoard: React.FC<OpponentBoardProps> = ({
  username,
  guessColors,
}) => {
  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="flex items-center gap-2">
        <span className="text-white font-bold">{username}</span>
      </div>

      <div className="flex flex-col gap-1 ">
        {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-1">
            {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
              const color = guessColors[rowIndex]?.[colIndex];
              return (
                <div
                  key={colIndex}
                  className={cn(
                    "border-2 border-border",
                    colorMap[color],
                    "transition-colors duration-300 h-6 w-8",
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
export default OpponentBoard;
