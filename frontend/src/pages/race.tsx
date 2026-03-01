import { useParams, useNavigate } from "react-router-dom";
import { useRace, RaceLobby, RaceRoom } from "@/features/race";
import { useEffect, useRef, useCallback } from "react";

const ROOM_ID_STORAGE_KEY = "race_active_room_id";

const Race = () => {
  const { roomId: roomIdFromUrl } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (autoJoinAttempted.current) return;
    if (room) return;

    autoJoinAttempted.current = true;

    const persistedRoomId = sessionStorage.getItem(ROOM_ID_STORAGE_KEY);
    const targetRoomId = roomIdFromUrl || persistedRoomId;

    if (targetRoomId) {
      rejoinRoom(targetRoomId);
    }

    return () => {
      // Reset so the StrictMode re-mount can retry
      autoJoinAttempted.current = false;
    };
  }, [roomIdFromUrl, room, rejoinRoom, joinRoom]);

  const handleLeave = useCallback(() => {
    disconnect();
    navigate("/race", { replace: true });
  }, [disconnect, navigate]);

  if (!room) {
    return <RaceLobby roomIdFromUrl={roomIdFromUrl} />;
  }

  return (
    <RaceRoom
      onLeave={handleLeave}
      onKeyPress={handleKeyPress}
      keyboardColors={keyboardColors}
      onRequestRematch={requestRematch}
      onAcceptRematch={acceptRematch}
    />
  );
};

export default Race;
