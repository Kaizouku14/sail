import { useParams } from "react-router-dom";
import { useRace, RaceLobby, RaceRoom } from "@/features/race";
import { useEffect, useRef } from "react";

const Race = () => {
  const { roomId: roomIdFromUrl } = useParams<{ roomId: string }>();
  const {
    room,
    disconnect,
    handleKeyPress,
    keyboardColors,
    joinRoom,
    rejoinRoom,
    requestRematch,
    acceptRematch,
  } = useRace();
  const autoJoinAttempted = useRef(false);

  // Auto-join if navigated via invite link, or attempt rejoin for reconnection
  useEffect(() => {
    if (autoJoinAttempted.current) return;
    if (room) return;

    autoJoinAttempted.current = true;

    if (roomIdFromUrl) {
      // Try rejoin first (handles reconnection), fall back to join (handles fresh invite)
      rejoinRoom(roomIdFromUrl);
    }
  }, [roomIdFromUrl, room, rejoinRoom, joinRoom]);

  if (!room) {
    return <RaceLobby roomIdFromUrl={roomIdFromUrl} />;
  }

  return (
    <RaceRoom
      onLeave={disconnect}
      onKeyPress={handleKeyPress}
      keyboardColors={keyboardColors}
      onRequestRematch={requestRematch}
      onAcceptRematch={acceptRematch}
    />
  );
};

export default Race;
