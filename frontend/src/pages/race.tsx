import { useParams } from "react-router-dom";
import { useRace, RaceLobby, RaceRoom } from "@/features/race";
import { useEffect, useRef } from "react";

const Race = () => {
  const { roomId: roomIdFromUrl } = useParams<{ roomId: string }>();
  const { room, disconnect, handleKeyPress, keyboardColors, joinRoom } =
    useRace();
  const autoJoinAttempted = useRef(false);

  // Auto-join if navigated via invite link
  useEffect(() => {
    if (roomIdFromUrl && !room && !autoJoinAttempted.current) {
      autoJoinAttempted.current = true;
      joinRoom(roomIdFromUrl);
    }
  }, [roomIdFromUrl, room, joinRoom]);

  if (!room) {
    return <RaceLobby roomIdFromUrl={roomIdFromUrl} />;
  }

  return (
    <RaceRoom
      onLeave={disconnect}
      onKeyPress={handleKeyPress}
      keyboardColors={keyboardColors}
    />
  );
};

export default Race;
