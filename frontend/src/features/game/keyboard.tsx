import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Delete } from "lucide-react";
import type { TileStatus } from "@/types/game.types";

interface KeyBoardProps {
  onKeyPress: (key: string) => void;
  keyboardColors: Record<string, TileStatus>;
  disabled?: boolean;
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DELETE"],
];

const keyStatusStyles: Record<TileStatus, string> = {
  CORRECT: "bg-chart-3 border-chart-3 text-neutral-100 hover:bg-chart-3/90",
  PRESENT: "bg-chart-2 border-chart-2 text-neutral-100 hover:bg-chart-2/90",
  ABSENT:
    "bg-secondary-background/60 border-secondary-background/60 text-foreground/50 hover:bg-secondary-background/50",
  ACTIVE: "",
  EMPTY: "",
};

const KeyBoard: React.FC<KeyBoardProps> = ({
  onKeyPress,
  keyboardColors,
  disabled = false,
}) => {
  const getKeyStyle = (key: string): string => {
    const color = keyboardColors[key.toLowerCase()];
    if (color && keyStatusStyles[color]) {
      return keyStatusStyles[color];
    }
    return "bg-secondary-background text-foreground hover:bg-secondary-background/80";
  };

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-lg mx-auto">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1.5">
          {row.map((key) => {
            const isWide = key === "ENTER" || key === "DELETE";

            return (
              <Button
                key={key}
                disabled={disabled}
                onClick={() => onKeyPress(key)}
                className={cn(
                  "h-14 font-bold text-sm rounded-base border-2 border-border shadow-shadow transition-colors duration-150",
                  isWide ? "px-3 min-w-16.25 text-xs" : "w-10 px-0",
                  getKeyStyle(key),
                  disabled && "opacity-50 cursor-not-allowed",
                )}
              >
                {key === "DELETE" ? <Delete className="size-5" /> : key}
              </Button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default KeyBoard;
