import { Board, KeyBoard } from "@/features/game";
import OpponentBoard from "@/features/race/opponent-board";

const Game = () => {
  const guessColors: string[][] = [
    ["CORRECT", "PRESENT", "ABSENT", "ABSENT", "ABSENT"],
    ["PRESENT", "CORRECT", "ABSENT", "PRESENT", "ABSENT"],
    ["CORRECT", "CORRECT", "CORRECT", "CORRECT", "ABSENT"],
    ["CORRECT", "CORRECT", "CORRECT", "CORRECT", "ABSENT"],
    ["CORRECT", "CORRECT", "CORRECT", "CORRECT", "ABSENT"],
    ["CORRECT", "CORRECT", "CORRECT", "CORRECT", "ABSENT"],
  ];

  return (
    <div className="flex gap-4 w-full">
      <div className="flex flex-col gap-6 w-full">
        <Board />
        <KeyBoard />
      </div>

      <OpponentBoard username="Player 2" guessColors={guessColors} />
    </div>
  );
};

export default Game;
