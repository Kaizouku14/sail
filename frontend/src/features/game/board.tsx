import type { TileStatus } from "@/types/tile-status";
import Title from "./tile";

const Board = () => {
  const tiles: { letter: string; status: TileStatus }[] = [
    { letter: "R", status: "CORRECT" },
    { letter: "E", status: "PRESENT" },
    { letter: "A", status: "ABSENT" },
    { letter: "C", status: "ABSENT" },
    { letter: "T", status: "CORRECT" },

    { letter: "H", status: "ABSENT" },
    { letter: "E", status: "PRESENT" },
    { letter: "L", status: "CORRECT" },
    { letter: "L", status: "CORRECT" },
    { letter: "O", status: "ABSENT" },

    { letter: "W", status: "ABSENT" },
    { letter: "O", status: "CORRECT" },
    { letter: "R", status: "PRESENT" },
    { letter: "L", status: "ABSENT" },
    { letter: "D", status: "CORRECT" },

    { letter: "G", status: "PRESENT" },
    { letter: "A", status: "ABSENT" },
    { letter: "M", status: "CORRECT" },
    { letter: "E", status: "ABSENT" },
    { letter: "S", status: "PRESENT" },

    { letter: "P", status: "ABSENT" },
    { letter: "L", status: "CORRECT" },
    { letter: "A", status: "PRESENT" },
    { letter: "Y", status: "ABSENT" },
    { letter: "S", status: "CORRECT" },

    { letter: "C", status: "ABSENT" },
    { letter: "O", status: "PRESENT" },
    { letter: "D", status: "CORRECT" },
    { letter: "E", status: "CORRECT" },
    { letter: "R", status: "ABSENT" },
  ];

  return (
    <div className="grid grid-cols-5 max-w-md mx-auto h-115 w-full">
      {tiles.map((tile, index) => {
        return <Title key={index} status={tile.status} letter={tile.letter} />;
      })}
    </div>
  );
};

export default Board;
