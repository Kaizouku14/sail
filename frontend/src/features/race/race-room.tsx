import { useAuthStore } from "@/store";
import { useRaceStore } from "@/store";
import { Board, KeyBoard } from "@/features/game";
import OpponentBoard from "./opponent-board";
import PlayerList from "./player-list";
import InviteLink from "./invite-link";
import { Button } from "@/components/ui/button";
import { LogOut, Clock } from "lucide-react";
import type { TileStatus } from "@/types/game.types";

interface RaceRoomProps {
  onLeave: () => void;
  onKeyPress: (key: string) => void;
  keyboardColors: Record<string, TileStatus>;
}

const WaitingOverlay = ({
  roomId,
  inviteLink,
}: {
  roomId: string;
  inviteLink: string;
}) => (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-base">
    <div className="flex flex-col items-center gap-4 p-6 max-w-xs text-center">
      <div className="rounded-base border-2 border-border bg-main/10 p-3">
        <Clock className="size-6 text-main" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-heading">Waiting for opponent</p>
        <p className="text-xs opacity-60">
          Share the room code below so a friend can join
        </p>
      </div>
      <InviteLink roomId={roomId} inviteLink={inviteLink} />
    </div>
  </div>
);

const GameOverBanner = ({
  myStatus,
  answer,
  myGuessCount,
  opponentName,
  opponentStatus,
}: {
  myStatus: "WON" | "LOST" | "PLAYING";
  answer: string | null;
  myGuessCount: number;
  opponentName: string | null;
  opponentStatus: string | null;
}) => {
  const isWinner = myStatus === "WON";

  let description = "";
  if (isWinner) {
    description = `You solved it in ${myGuessCount} ${myGuessCount === 1 ? "guess" : "guesses"}!`;
  } else if (myStatus === "LOST" && opponentStatus === "WON") {
    description = `${opponentName ?? "Opponent"} solved it first.`;
  } else {
    description = "Neither player solved it.";
  }

  if (answer) {
    description += ` The word was ${answer.toUpperCase()}.`;
  }

  return (
    <div
      className={`w-full rounded-base border-2 shadow-shadow p-4 text-center ${
        isWinner
          ? "bg-chart-3/20 border-chart-3"
          : "bg-red-500/20 border-red-500"
      }`}
    >
      <p className="text-lg font-heading">
        {isWinner ? "🎉 You won!" : "😔 Game over"}
      </p>
      <p className="text-sm opacity-80">{description}</p>
    </div>
  );
};

/** In-game race view — reuses shared Board and KeyBoard components. */
const RaceRoom: React.FC<RaceRoomProps> = ({
  onLeave,
  onKeyPress,
  keyboardColors,
}) => {
  const { user } = useAuthStore();
  const { room, roomId, guesses, currentGuess, answer } = useRaceStore();

  if (!room || !roomId) return null;

  const myId = user?.id ?? null;
  const myPlayer = room.players.find((p) => p.id === myId) ?? null;
  const opponent = room.players.find((p) => p.id !== myId) ?? null;

  const isWaiting = room.status === "WAITING";
  const isFinished = room.status === "FINISHED";
  const isPlaying = room.status === "IN_PROGRESS";

  const myTurnDone = myPlayer?.status === "WON" || myPlayer?.status === "LOST";

  const inviteLink = `${window.location.origin}/race/${roomId}`;

  // Board is still interactive when the game is in progress and the player hasn't finished
  const isBoardActive = isPlaying && !myTurnDone;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-heading">Race</h2>
          {isWaiting && (
            <span className="inline-flex items-center gap-1.5 rounded-base border border-chart-2/40 bg-chart-2/10 px-2 py-0.5 text-xs font-heading text-chart-2">
              <Clock className="size-3" />
              Waiting
            </span>
          )}
          {isPlaying && (
            <span className="inline-flex items-center rounded-base border border-chart-5/40 bg-chart-5/10 px-2 py-0.5 text-xs font-heading text-chart-5">
              Live
            </span>
          )}
          {isFinished && (
            <span className="inline-flex items-center rounded-base border border-foreground/20 bg-foreground/5 px-2 py-0.5 text-xs font-heading opacity-60">
              Finished
            </span>
          )}
        </div>

        <Button
          variant="neutral"
          size="sm"
          onClick={onLeave}
          className="flex items-center gap-2"
        >
          <LogOut className="size-4" />
          Leave
        </Button>
      </div>

      {isFinished && myPlayer && (
        <GameOverBanner
          myStatus={myPlayer.status}
          answer={answer}
          myGuessCount={guesses.length}
          opponentName={opponent?.username ?? null}
          opponentStatus={opponent?.status ?? null}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        <div className="flex flex-col items-center gap-4 flex-1 min-w-0 relative">
          {isWaiting && (
            <WaitingOverlay roomId={roomId} inviteLink={inviteLink} />
          )}

          <Board
            guesses={guesses}
            currentGuess={currentGuess}
            isActive={isBoardActive}
          />

          <KeyBoard
            onKeyPress={onKeyPress}
            keyboardColors={keyboardColors}
            disabled={isWaiting || isFinished || myTurnDone}
          />
        </div>

        <div className="flex flex-col gap-4 lg:w-56 shrink-0">
          <PlayerList
            players={room.players}
            currentUserId={myId}
            hostId={room.hostId}
          />

          {opponent && (
            <div className="flex flex-col gap-2 items-center">
              <OpponentBoard
                username={opponent.username}
                guessColors={opponent.guessColors}
                status={opponent.status}
                guessCount={opponent.guesses}
              />
            </div>
          )}

          {!isFinished && roomId && (
            <InviteLink roomId={roomId} inviteLink={inviteLink} />
          )}
        </div>
      </div>
    </div>
  );
};

export default RaceRoom;
