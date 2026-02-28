import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRace } from "./use-race";
import { useAuthStore } from "@/store";
import { PageRoutes } from "@/utils/constants";
import { Loader2, Plus, LogIn, Swords } from "lucide-react";
import { sileo } from "sileo";

interface RaceLobbyProps {
  roomIdFromUrl?: string;
}

const RaceLobby: React.FC<RaceLobbyProps> = ({ roomIdFromUrl }) => {
  const [joinCode, setJoinCode] = useState(roomIdFromUrl ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const { createRoom, joinRoom, connectionStatus } = useRace();
  const navigate = useNavigate();

  const isConnecting = connectionStatus === "connecting";

  const handleCreate = () => {
    if (!isAuthenticated) {
      sileo.error({
        title: "Sign in required",
        description: "You need to be logged in to create a room",
      });
      navigate(PageRoutes.LOGIN);
      return;
    }

    setIsCreating(true);
    createRoom();
  };

  const handleJoin = () => {
    const code = joinCode.trim();
    if (!code) {
      sileo.error({
        title: "Missing room code",
        description: "Please enter a room code to join",
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
    joinRoom(code);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleJoin();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-md mx-auto py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="rounded-base border-2 border-border bg-main p-3 shadow-shadow">
          <Swords className="size-8 text-main-foreground" />
        </div>
        <h1 className="text-2xl font-heading mt-2">Race Mode</h1>
        <p className="text-sm opacity-70 max-w-xs">
          Challenge a friend to solve the same word. First to guess it wins.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <Card className="bg-main-foreground/10">
          <CardHeader>
            <CardTitle className="text-base">Create a room</CardTitle>
            <CardDescription>
              Start a new room and invite a friend with the room code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCreate}
              disabled={isCreating || isConnecting}
              className="w-full flex items-center gap-2"
            >
              {isCreating || isConnecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create Room
                </>
              )}
            </Button>
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
              Enter a room code from a friend to join their game
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Paste room code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isJoining || isConnecting}
                className="font-mono text-sm tracking-wider"
              />
              <Button
                variant="neutral"
                onClick={handleJoin}
                disabled={isJoining || isConnecting || !joinCode.trim()}
                className="w-full flex items-center gap-2"
              >
                {isJoining || isConnecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <LogIn className="size-4" />
                    Join Room
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RaceLobby;
