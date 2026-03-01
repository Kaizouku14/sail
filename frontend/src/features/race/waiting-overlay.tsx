import { Clock } from "lucide-react";
import InviteLink from "./invite-link";

interface WaitingOverlayProps {
  roomId: string;
  inviteLink: string;
}

const WaitingOverlay: React.FC<WaitingOverlayProps> = ({
  roomId,
  inviteLink,
}) => (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background backdrop-blur-sm rounded-base">
    <div className="flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-6 max-w-xs w-full text-center">
      <div className="rounded-base border-2 border-border bg-main/10 p-2.5 sm:p-3">
        <Clock className="size-5 sm:size-6 text-main" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-heading">Waiting for opponent</p>
        <p className="text-[11px] sm:text-xs opacity-60">
          Share the room code below so a friend can join
        </p>
      </div>
      <InviteLink roomId={roomId} inviteLink={inviteLink} />
    </div>
  </div>
);

export default WaitingOverlay;
