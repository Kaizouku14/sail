import { useAuthStore } from "@/store";
import { useRaceStore } from "@/store";
import { Board, KeyBoard } from "@/features/game";
import OpponentBoard from "./opponent-board";
import PlayerList from "./player-list";
import InviteLink from "./invite-link";
import WaitingOverlay from "./waiting-overlay";
import GameOverBanner from "./game-over-banner";
import RaceTimer from "./race-timer";
import { Button } from "@/components/ui/button";
import { LogOut, Clock } from "lucide-react";
import type { TileStatus } from "@/types/game.types";

interface RaceRoomProps {
  onLeave: () => void;
  onKeyPress: (key: string) => void;
  keyboardColors: Record<string, TileStatus>;
  onRequestRematch: () => void;
  onAcceptRematch: () => void;
}

const RaceRoom: React.FC<RaceRoomProps> = ({
  onLeave,
  onKeyPress,
  keyboardColors,
  onRequestRematch,
  onAcceptRematch,
}) => {
  const { user } = useAuthStore();
  const {
    room,
    roomId,
    guesses,
    currentGuess,
    answer,
    remainingSeconds,
    timerStatus,
    rematchFrom,
  } = useRaceStore();

  if (!room || !roomId) return null;

  const myId = user?.id ?? null;
  const myPlayer = room.players.find((p) => p.id === myId) ?? null;
  const opponent = room.players.find((p) => p.id !== myId) ?? null;

  const isWaiting = room.status === "WAITING";
  const isFinished = room.status === "FINISHED";
  const isPlaying = room.status === "IN_PROGRESS";

  const myTurnDone = myPlayer?.status === "WON" || myPlayer?.status === "LOST";
  const timeExpired = timerStatus === "expired";

  const inviteLink = `${window.location.origin}/race/${roomId}`;

  const isBoardActive = isPlaying && !myTurnDone && !timeExpired;

  return (
    <div className="flex flex-col gap-2 sm:gap-4 w-full h-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-base sm:text-lg font-heading">Race</h2>
          {isWaiting && (
            <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-base border border-chart-2/40 bg-chart-2/10 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-heading text-chart-2">
              <Clock className="size-2.5 sm:size-3" />
              Waiting
            </span>
          )}
          {isPlaying && !timeExpired && (
            <span className="inline-flex items-center rounded-base border border-chart-5/40 bg-chart-5/10 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-heading text-chart-5">
              Live
            </span>
          )}
          {(isFinished || timeExpired) && (
            <span className="inline-flex items-center rounded-base border border-foreground/20 bg-foreground/5 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-heading opacity-60">
              Finished
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {(isPlaying || isFinished) && (
            <RaceTimer
              remainingSeconds={remainingSeconds}
              timerStatus={timerStatus}
            />
          )}

          <Button
            variant="neutral"
            size="sm"
            onClick={onLeave}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
          >
            <LogOut className="size-3.5 sm:size-4" />
            <span className="hidden xs:inline">Leave</span>
          </Button>
        </div>
      </div>

      {isFinished && myPlayer && (
        <div className="shrink-0">
          <GameOverBanner
            myStatus={myPlayer.status}
            answer={answer}
            myGuessCount={guesses.length}
            opponentName={opponent?.username ?? null}
            opponentStatus={opponent?.status ?? null}
            opponentGuessCount={opponent?.guesses ?? 0}
            timeExpired={timeExpired}
            rematchFrom={rematchFrom}
            onRequestRematch={onRequestRematch}
            onAcceptRematch={onAcceptRematch}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-6 flex-1 min-h-0">
        {/* Left: Board + Keyboard */}
        <div className="flex flex-col items-center gap-2 sm:gap-4 flex-1 min-w-0 min-h-0 relative">
          {isWaiting && (
            <WaitingOverlay roomId={roomId} inviteLink={inviteLink} />
          )}

          <div className="flex-1 w-full min-h-0 px-2 sm:px-0">
            <Board
              guesses={guesses}
              currentGuess={currentGuess}
              isActive={isBoardActive}
            />
          </div>

          <div className="w-full shrink-0 pb-1 sm:pb-0">
            <KeyBoard
              onKeyPress={onKeyPress}
              keyboardColors={keyboardColors}
              disabled={isWaiting || isFinished || myTurnDone || timeExpired}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4 lg:w-56 shrink-0">
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
