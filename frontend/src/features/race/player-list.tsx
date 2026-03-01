import { cn } from "@/lib/utils";
import type { RoomPlayer } from "@/types/socket.types";
import { Crown, Trophy, XCircle, Swords } from "lucide-react";

interface PlayerListProps {
  players: RoomPlayer[];
  currentUserId: string | null;
  hostId: string;
}

const statusConfig: Record<
  RoomPlayer["status"],
  { label: string; className: string; icon: React.ReactNode }
> = {
  PLAYING: {
    label: "Playing",
    className: "bg-chart-5/20 text-chart-5 border-chart-5/40",
    icon: <Swords className="size-3" />,
  },
  WON: {
    label: "Won",
    className: "bg-chart-3/20 text-chart-3 border-chart-3/40",
    icon: <Trophy className="size-3" />,
  },
  LOST: {
    label: "Lost",
    className: "bg-red-500/20 text-red-400 border-red-500/40",
    icon: <XCircle className="size-3" />,
  },
};

const PlayerList: React.FC<PlayerListProps> = ({
  players,
  currentUserId,
  hostId,
}) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-sm font-heading opacity-70">
        Players ({players.length}/2)
      </p>

      <div className="flex flex-col gap-2">
        {players.map((player) => {
          const isMe = player.id === currentUserId;
          const isHost = player.id === hostId;
          const config = statusConfig[player.status];

          return (
            <div
              key={player.id}
              className={cn(
                "flex items-center justify-between rounded-base border-2 border-border px-3 py-2",
                isMe && "bg-main/10 border-main/30",
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isHost && <Crown className="size-3.5 text-chart-2 shrink-0" />}
                <span
                  className={cn(
                    "text-sm font-heading truncate",
                    isMe && "text-main",
                  )}
                >
                  {player.username}
                  {isMe && (
                    <span className="text-xs font-base opacity-60 ml-1">
                      (you)
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {player.guesses > 0 && (
                  <span className="text-xs opacity-50">{player.guesses}/6</span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-base border px-2 py-0.5 text-xs font-heading",
                    config.className,
                  )}
                >
                  {config.icon}
                  {config.label}
                </span>
              </div>
            </div>
          );
        })}

        {players.length < 2 && (
          <div className="flex items-center justify-center rounded-base border-2 border-dashed border-border/40 px-3 py-3">
            <span className="text-xs opacity-40">Waiting for opponent...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerList;
