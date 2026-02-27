import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Delete } from "lucide-react";

const KeyBoard = () => {
  const keyboardRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "delete"],
  ];

  return (
    <div className="flex flex-col gap-2">
      {keyboardRows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-2">
          {row.map((k) => (
            <Button
              key={k}
              className={cn(
                k === "ENTER" || k === "delete" ? "px-4" : "w-20",
                "h-13 font-bold text-base bg-secondary-background text-foreground",
              )}
            >
              {k === "delete" ? <Delete className="size-6" /> : k}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default KeyBoard;
