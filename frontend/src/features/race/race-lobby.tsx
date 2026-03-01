import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { useRace } from "../../hooks/use-race";
import { useAuthStore } from "@/store";
import { useRaceStore } from "@/store";
import { PageRoutes } from "@/utils/constants";
import { Plus, LogIn, Swords } from "lucide-react";
import { sileo } from "sileo";

interface RaceLobbyProps {
  roomIdFromUrl?: string;
}

function parseRoomId(input: string): string {
  const trimmed = input.trim();

  const racePathMatch = trimmed.match(/\/race\/([^/?#]+)/);
  if (racePathMatch?.[1]) {
    return racePathMatch[1];
  }

  return trimmed;
}

const RaceLobby: React.FC<RaceLobbyProps> = ({ roomIdFromUrl }) => {
  const [joinCode, setJoinCode] = useState(roomIdFromUrl ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const { createRoom, joinRoom, connectionStatus } = useRace();
  const navigate = useNavigate();

  const isConnecting = connectionStatus === "connecting";

  const error = useRaceStore((s) => s.error);

  useEffect(() => {
    if (error) {
      setIsCreating(false);
      setIsJoining(false);
    }
  }, [error]);

  const handleCreate = useCallback(async () => {
    if (!isAuthenticated) {
      sileo.error({
        title: "Sign in required",
        description: "You need to be logged in to create a room",
      });
      navigate(PageRoutes.LOGIN);
      return;
    }

    setIsCreating(true);
    try {
      await createRoom();
    } finally {
      setIsCreating(false);
    }
  }, [isAuthenticated, createRoom, navigate]);

  const handleJoin = useCallback(async () => {
    const roomId = parseRoomId(joinCode);
    if (!roomId) {
      sileo.error({
        title: "Missing room code",
        description: "Please enter a room code or paste an invite link",
      });
      return;
    }

    if (!isAuthenticated) {
      sileo.error({
        title: "Sign in required",
        description: "You need to be logged in to join a room",
      });
      navigate(PageRoutes.LOGIN);
      return;
    }

    setIsJoining(true);
    try {
      await joinRoom(roomId);
    } finally {
      setIsJoining(false);
    }
  }, [joinCode, isAuthenticated, joinRoom, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleJoin();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 sm:gap-8 w-full max-w-md mx-auto px-2 sm:px-0 py-8 sm:py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="rounded-base border-2 border-border bg-main p-2.5 sm:p-3 shadow-shadow">
          <Swords className="size-6 sm:size-8 text-main-foreground" />
        </div>
        <h1 className="text-xl sm:text-2xl font-heading mt-2">Race Mode</h1>
        <p className="text-xs sm:text-sm opacity-70 max-w-xs">
          Challenge a friend to solve the same word. First to guess it wins.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 w-full">
        <Card className="bg-main-foreground/10">
          <CardHeader>
            <CardTitle className="text-base">Create a room</CardTitle>
            <CardDescription>
              Start a new room and invite a friend with the room code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingButton
              loading={isCreating || isConnecting}
              loadingText="Creating..."
              icon={<Plus className="size-4" />}
              onClick={handleCreate}
              className="w-full"
            >
              Create Room
            </LoadingButton>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-heading opacity-50 uppercase">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Card className="bg-main-foreground/10">
          <CardHeader>
            <CardTitle className="text-base">Join a room</CardTitle>
            <CardDescription>
              Enter a room code or paste an invite link to join
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Paste room code or invite link..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isJoining || isConnecting}
                className="font-mono text-sm tracking-wider"
              />
              <LoadingButton
                variant="neutral"
                loading={isJoining || isConnecting}
                loadingText="Joining..."
                icon={<LogIn className="size-4" />}
                onClick={handleJoin}
                disabled={!joinCode.trim()}
                className="w-full"
              >
                Join Room
              </LoadingButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RaceLobby;
