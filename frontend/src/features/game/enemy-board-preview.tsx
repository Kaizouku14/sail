import { cn, mapBg } from "@/lib/utils";
import type { TileStatus } from "@/types/tile-status";

interface EnemyBoardPreviewProps {
  tiles?: { status: TileStatus }[];
}

const EnemyBoardPreview: React.FC<EnemyBoardPreviewProps> = ({ tiles }) => {
  const MocktilesData = [
    { status: "CORRECT" },
    { status: "PRESENT" },
    { status: "ABSENT" },
    { status: "ABSENT" },
    { status: "CORRECT" },

    { status: "ABSENT" },
    { status: "PRESENT" },
    { status: "CORRECT" },
    { status: "CORRECT" },
    { status: "ABSENT" },

    { status: "ABSENT" },
    { status: "CORRECT" },
    { status: "PRESENT" },
    { status: "ABSENT" },
    { status: "CORRECT" },

    { status: "PRESENT" },
    { status: "ABSENT" },
    { status: "CORRECT" },
    { status: "ABSENT" },
    { status: "PRESENT" },

    { status: "ABSENT" },
    { status: "CORRECT" },
    { status: "PRESENT" },
    { status: "ABSENT" },
    { status: "CORRECT" },

    { status: "ABSENT" },
    { status: "PRESENT" },
    { status: "CORRECT" },
    { status: "CORRECT" },
    { status: "ABSENT" },
  ];

  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="text-2xl">Answer</div>
      <div className="grid grid-cols-5 mx-auto size-40 ">
        {MocktilesData.map((v, i) => (
          <div
            key={i}
            className={cn(
              "border-2 border-border",
              mapBg[v.status as TileStatus],
            )}
          ></div>
        ))}
      </div>
    </div>
  );
};
export default EnemyBoardPreview;
