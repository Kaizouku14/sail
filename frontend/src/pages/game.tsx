import { Board, KeyBoard, EnemyBoardPreview } from "@/features/game";

const Game = () => {
  return (
    <div className="flex gap-4 w-full">
      <div className="flex flex-col gap-6 w-full">
        <Board />
        <KeyBoard />
      </div>

      <EnemyBoardPreview />
    </div>
  );
};

export default Game;
