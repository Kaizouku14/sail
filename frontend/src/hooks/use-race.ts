import { useCallback, useEffect, useRef } from "react";
import { useRaceStore } from "@/store";
import { useAuthStore } from "@/store";
import { socketService } from "@/service/socket.service";
import { sileo } from "sileo";
import { WORD_LENGTH } from "@/utils/constants";
import type { TileStatus } from "@/types/game.types";
import type {
  ConnectedPayload,
  WsErrorPayload,
  RoomState,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  PlayerRejoinedPayload,
  GuessResultPayload,
  OpponentGuessPayload,
  PlayerWonPayload,
  GameOverPayload,
  TimerStartPayload,
  TimerTickPayload,
  TimeUpPayload,
  RematchOfferPayload,
  RematchAcceptedPayload,
  WsAckResponse,
} from "@/types/socket.types";

export function useRace() {
  const store = useRaceStore();
  const { user } = useAuthStore();
  const listenersAttached = useRef(false);

  const attachListeners = useCallback(() => {
    if (listenersAttached.current) return;
    listenersAttached.current = true;

    socketService.on<ConnectedPayload>("CONNECTED", (data) => {
      useRaceStore.getState().setConnectionStatus("connected");
      console.log("[race] authenticated as", data.userId);
    });

    socketService.on<WsErrorPayload>("ERROR", (data) => {
      useRaceStore.getState().setError(data.message);
      sileo.error({ title: "Room error", description: data.message });
    });

    socketService.on<PlayerJoinedPayload>("PLAYER_JOINED", (data) => {
      useRaceStore.getState().addPlayer({
        id: data.playerId,
        username: data.username,
        guesses: 0,
        status: "PLAYING",
        guessColors: [],
      });
      useRaceStore.getState().setRoomStatus("IN_PROGRESS");
      sileo.success({
        title: "Player joined",
        description: `${data.username} entered the room`,
      });
    });

    socketService.on<PlayerLeftPayload>("PLAYER_LEFT", (data) => {
      const room = useRaceStore.getState().room;
      const leaving = room?.players.find((p) => p.id === data.playerId);
      if (leaving) {
        sileo.error({
          title: "Player disconnected",
          description: `${leaving.username} lost connection`,
        });
      }
    });

    socketService.on<PlayerRejoinedPayload>("PLAYER_REJOINED", (data) => {
      const currentUser = useAuthStore.getState().user;
      if (data.playerId === currentUser?.id) return;

      sileo.success({
        title: "Player reconnected",
        description: `${data.username} is back`,
      });
    });

    socketService.on<GuessResultPayload>("GUESS_RESULT", (data) => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser || data.playerId !== currentUser.id) return;

      const current = useRaceStore.getState().currentGuess;
      const letters = current.split("");

      const guess = {
        word: current,
        results: letters.map((letter, i) => ({
          letter,
          status: (data.results[i] ?? "ABSENT") as TileStatus,
        })),
      };

      useRaceStore.getState().pushGuess(guess);
    });

    socketService.on<OpponentGuessPayload>("OPPONENT_GUESS", (data) => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser || data.playerId === currentUser.id) return;

      useRaceStore.getState().updatePlayer(data.playerId, {
        guesses: data.guessNumber,
        guessColors: [
          ...(useRaceStore
            .getState()
            .room?.players.find((p) => p.id === data.playerId)?.guessColors ??
            []),
          data.colors,
        ],
      });
    });

    socketService.on<PlayerWonPayload>("PLAYER_WON", (data) => {
      const currentUser = useAuthStore.getState().user;
      useRaceStore.getState().updatePlayer(data.playerId, { status: "WON" });

      const winner = useRaceStore
        .getState()
        .room?.players.find((p) => p.id === data.playerId);

      if (data.playerId === currentUser?.id) {
        sileo.success({
          title: "You won!",
          description: `Solved in ${data.guessCount} ${data.guessCount === 1 ? "guess" : "guesses"}`,
        });
      } else {
        sileo.error({
          title: "Opponent won",
          description: `${winner?.username ?? "Opponent"} solved it in ${data.guessCount} guesses`,
        });
      }
    });

    socketService.on<GameOverPayload>("GAME_OVER", (data) => {
      useRaceStore.getState().setAnswer(data.answer);
      useRaceStore.getState().setRoomStatus("FINISHED");
      useRaceStore.getState().expireTimer();
    });

    // Timer events
    socketService.on<TimerStartPayload>("TIMER_START", (data) => {
      useRaceStore.getState().setTimer(data.remainingSeconds, data.timeLimit);
    });

    socketService.on<TimerTickPayload>("TIMER_TICK", (data) => {
      useRaceStore.getState().tickTimer(data.remainingSeconds);
    });

    socketService.on<TimeUpPayload>("TIME_UP", (data) => {
      useRaceStore.getState().expireTimer();
      useRaceStore.getState().setAnswer(data.answer);
      sileo.error({
        title: "Time's up!",
        description: `The word was ${data.answer.toUpperCase()}`,
      });
    });

    // Rematch events
    socketService.on<RematchOfferPayload>("REMATCH_OFFER", (data) => {
      const currentUser = useAuthStore.getState().user;
      if (data.fromPlayerId === currentUser?.id) return;

      useRaceStore
        .getState()
        .setRematchOffer(data.newRoomId, data.fromUsername);

      sileo.success({
        title: "Rematch offered",
        description: `${data.fromUsername} wants a rematch!`,
      });
    });

    socketService.on<RematchAcceptedPayload>("REMATCH_ACCEPTED", () => {
      useRaceStore.getState().clearRematchOffer();
    });
  }, []);

  const detachListeners = useCallback(() => {
    if (!listenersAttached.current) return;
    listenersAttached.current = false;

    const events = [
      "CONNECTED",
      "ERROR",
      "PLAYER_JOINED",
      "PLAYER_LEFT",
      "PLAYER_REJOINED",
      "GUESS_RESULT",
      "OPPONENT_GUESS",
      "PLAYER_WON",
      "GAME_OVER",
      "TIMER_START",
      "TIMER_TICK",
      "TIME_UP",
      "REMATCH_OFFER",
      "REMATCH_ACCEPTED",
    ];
    events.forEach((e) => socketService.off(e));
  }, []);

  const connect = useCallback(() => {
    try {
      useRaceStore.getState().setConnectionStatus("connecting");
      socketService.connect();
      attachListeners();
    } catch {
      useRaceStore.getState().setConnectionStatus("error");
      useRaceStore
        .getState()
        .setError("Failed to connect — are you signed in?");
    }
  }, [attachListeners]);

  const disconnect = useCallback(() => {
    detachListeners();
    socketService.disconnect();
    useRaceStore.getState().reset();
  }, [detachListeners]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      detachListeners();
      socketService.disconnect();
    };
  }, [detachListeners]);

  const createRoom = useCallback(() => {
    if (!socketService.isConnected()) {
      connect();
      socketService.once("CONNECTED", () => {
        socketService.emit("createRoom", undefined, (response: unknown) => {
          const ack = response as WsAckResponse<RoomState>;
          if (ack?.data) {
            useRaceStore.getState().setRoom(ack.data);
          }
        });
      });
      return;
    }

    socketService.emit("createRoom", undefined, (response: unknown) => {
      const ack = response as WsAckResponse<RoomState>;
      if (ack?.data) {
        useRaceStore.getState().setRoom(ack.data);
      }
    });
  }, [connect]);

  const joinRoom = useCallback(
    (roomId: string) => {
      const doJoin = () => {
        socketService.emit("joinRoom", { roomId }, (response: unknown) => {
          const ack = response as WsAckResponse<RoomState>;
          if (ack?.data) {
            useRaceStore.getState().setRoom(ack.data);
          }
        });
      };

      if (!socketService.isConnected()) {
        connect();
        socketService.once("CONNECTED", doJoin);
        return;
      }

      doJoin();
    },
    [connect],
  );

  /** Reconnect to an active room (after socket drop or page refresh). */
  const rejoinRoom = useCallback(
    (roomId?: string) => {
      const doRejoin = () => {
        socketService.emit(
          "rejoinRoom",
          roomId ? { roomId } : undefined,
          (response: unknown) => {
            const ack = response as WsAckResponse<RoomState>;
            if (ack?.data) {
              useRaceStore.getState().setRoom(ack.data);
            }
          },
        );
      };

      if (!socketService.isConnected()) {
        connect();
        socketService.once("CONNECTED", doRejoin);
        return;
      }

      doRejoin();
    },
    [connect],
  );

  const submitGuess = useCallback(() => {
    const { currentGuess, room } = useRaceStore.getState();
    const currentUser = useAuthStore.getState().user;

    if (!room || room.status !== "IN_PROGRESS") return;
    if (!currentUser) return;

    const myPlayer = room.players.find((p) => p.id === currentUser.id);
    if (!myPlayer || myPlayer.status !== "PLAYING") return;

    if (currentGuess.length !== WORD_LENGTH) {
      useRaceStore.getState().setError("Not enough letters");
      sileo.error({
        title: "Not enough letters",
        description: `Word must be ${WORD_LENGTH} letters`,
      });
      return;
    }

    // Check if timer expired on client side
    const { timerStatus } = useRaceStore.getState();
    if (timerStatus === "expired") {
      sileo.error({ title: "Time's up", description: "The match has ended" });
      return;
    }

    socketService.emit("submitGuess", { word: currentGuess.toLowerCase() });
  }, []);

  const handleKeyPress = useCallback(
    (key: string) => {
      const { room, timerStatus } = useRaceStore.getState();
      if (!room || room.status !== "IN_PROGRESS") return;
      if (timerStatus === "expired") return;

      const currentUser = useAuthStore.getState().user;
      if (!currentUser) return;
      const myPlayer = room.players.find((p) => p.id === currentUser.id);
      if (!myPlayer || myPlayer.status !== "PLAYING") return;

      if (key === "ENTER") {
        submitGuess();
      } else if (key === "DELETE" || key === "BACKSPACE") {
        useRaceStore.getState().removeLetter();
      } else if (/^[A-Z]$/.test(key)) {
        useRaceStore.getState().addLetter(key);
      }
    },
    [submitGuess],
  );

  // Physical keyboard listener
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleKeyPress("ENTER");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleKeyPress("DELETE");
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKeyPress(e.key.toUpperCase());
      }
    },
    [handleKeyPress],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /** Request a rematch after the current game finishes. */
  const requestRematch = useCallback(() => {
    const { roomId } = useRaceStore.getState();
    if (!roomId) return;

    socketService.emit("requestRematch", { roomId }, (response: unknown) => {
      const ack = response as WsAckResponse<RoomState>;
      if (ack?.data) {
        useRaceStore.getState().reset();
        useRaceStore.getState().setRoom(ack.data);
      }
    });
  }, []);

  /** Accept a rematch offer from the opponent. */
  const acceptRematch = useCallback(() => {
    const { rematchRoomId, roomId } = useRaceStore.getState();
    if (!rematchRoomId || !roomId) return;

    socketService.emit(
      "acceptRematch",
      { previousRoomId: roomId },
      (response: unknown) => {
        const ack = response as WsAckResponse<RoomState>;
        if (ack?.data) {
          useRaceStore.getState().reset();
          useRaceStore.getState().setRoom(ack.data);
        }
      },
    );
  }, []);

  const myId = user?.id ?? null;

  const myPlayer = store.room?.players.find((p) => p.id === myId) ?? null;

  const opponent = store.room?.players.find((p) => p.id !== myId) ?? null;

  const isHost = store.room?.hostId === myId;

  const isMyTurnDone =
    myPlayer?.status === "WON" || myPlayer?.status === "LOST";

  const isRoomFull = (store.room?.players.length ?? 0) >= 2;

  const inviteLink = store.roomId
    ? `${window.location.origin}/race/${store.roomId}`
    : null;

  return {
    // Connection
    connectionStatus: store.connectionStatus,

    // Room state
    roomId: store.roomId,
    room: store.room,
    currentGuess: store.currentGuess,
    keyboardColors: store.keyboardColors,
    answer: store.answer,
    error: store.error,

    // Timer
    remainingSeconds: store.remainingSeconds,
    timeLimit: store.timeLimit,
    timerStatus: store.timerStatus,

    // Rematch
    rematchRoomId: store.rematchRoomId,
    rematchFrom: store.rematchFrom,

    // Computed
    myPlayer,
    opponent,
    isHost,
    isMyTurnDone,
    isRoomFull,
    inviteLink,

    // Actions
    connect,
    disconnect,
    createRoom,
    joinRoom,
    rejoinRoom,
    submitGuess,
    handleKeyPress,
    requestRematch,
    acceptRematch,
  };
}
