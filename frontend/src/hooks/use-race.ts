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
  PlayerLostPayload,
  GameOverPayload,
  TimerStartPayload,
  TimerTickPayload,
  TimeUpPayload,
  RematchOfferPayload,
  RematchAcceptedPayload,
  WsAckResponse,
} from "@/types/socket.types";

const ROOM_ID_STORAGE_KEY = "race_active_room_id";

function persistRoomId(roomId: string | null): void {
  if (roomId) {
    sessionStorage.setItem(ROOM_ID_STORAGE_KEY, roomId);
  } else {
    sessionStorage.removeItem(ROOM_ID_STORAGE_KEY);
  }
}

function getPersistedRoomId(): string | null {
  return sessionStorage.getItem(ROOM_ID_STORAGE_KEY);
}

export function useRace() {
  const store = useRaceStore();
  const { user } = useAuthStore();
  const listenersAttached = useRef(false);
  // Guard: when the user explicitly leaves, prevent auto-rejoin logic
  // from pulling them back into the room they just left.
  const leavingRef = useRef(false);

  const attachListeners = useCallback(() => {
    if (listenersAttached.current) return;
    listenersAttached.current = true;

    socketService.on<ConnectedPayload>("CONNECTED", (data) => {
      useRaceStore.getState().setConnectionStatus("connected");
      console.log("[race] authenticated as", data.userId);

      // Auto-rejoin on reconnection: if we already have an active room in
      // the store or sessionStorage, re-emit rejoinRoom so the server puts
      // our new socket back into the Socket.IO room.  This handles tab
      // switches, network hiccups, and any other Socket.IO reconnect.
      const { roomId, room } = useRaceStore.getState();
      const persistedId = sessionStorage.getItem(ROOM_ID_STORAGE_KEY);
      const targetRoomId = roomId || persistedId;

      if (targetRoomId && room && !leavingRef.current) {
        // We already have local room state — just re-join the server room
        // so we keep receiving events. Use updateRoomMeta on success so the
        // timer is NOT reset.
        console.log(
          "[race] auto-rejoining room after reconnect:",
          targetRoomId,
        );
        socketService.emit(
          "rejoinRoom",
          { roomId: targetRoomId },
          (response: unknown) => {
            const ack = response as WsAckResponse<RoomState>;
            if (ack?.data) {
              // Only update room metadata (players, status) — preserve timer
              useRaceStore.getState().updateRoomMeta({
                status: ack.data.status,
                players: ack.data.players,
                startedAt: ack.data.startedAt,
                finishedAt: ack.data.finishedAt,
                remainingSeconds: ack.data.remainingSeconds,
                timeLimit: ack.data.timeLimit,
              });
            } else if (ack?.error) {
              console.warn("[race] auto-rejoin failed:", ack.error);
              // Room no longer exists — clean up
              sessionStorage.removeItem(ROOM_ID_STORAGE_KEY);
            }
          },
        );
      }
    });

    socketService.on<WsErrorPayload>("ERROR", (data) => {
      useRaceStore.getState().setError(data.message);
      sileo.error({ title: "Room error", description: data.message });
    });

    socketService.on<PlayerJoinedPayload>("PLAYER_JOINED", (data) => {
      const state = useRaceStore.getState();

      // Add the new player to the room (no-op if already present)
      state.addPlayer({
        id: data.playerId,
        username: data.username,
        guesses: 0,
        status: "PLAYING",
        guessColors: [],
      });

      // Use updateRoomMeta (NOT setRoom) so we update status / startedAt
      // without clobbering the timer if it is already running.
      useRaceStore.getState().updateRoomMeta({
        status: data.roomStatus,
        startedAt: data.startedAt,
        remainingSeconds: data.remainingSeconds,
        timeLimit: data.timeLimit,
      });

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

      // Update own player status from authoritative server response
      if (data.status && data.status !== "PLAYING") {
        useRaceStore
          .getState()
          .updatePlayer(data.playerId, { status: data.status });

        if (data.status === "LOST" && data.answer) {
          useRaceStore.getState().setAnswer(data.answer);
          sileo.error({
            title: "Game over",
            description: `The word was ${data.answer.toUpperCase()}`,
          });
        }
      }
    });

    socketService.on<OpponentGuessPayload>("OPPONENT_GUESS", (data) => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser || data.playerId === currentUser.id) return;

      const opponent = useRaceStore
        .getState()
        .room?.players.find((p) => p.id === data.playerId);

      useRaceStore.getState().updatePlayer(data.playerId, {
        guesses: data.guessNumber,
        guessColors: [...(opponent?.guessColors ?? []), data.colors],
        status: data.status,
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

    socketService.on<PlayerLostPayload>("PLAYER_LOST", (data) => {
      const currentUser = useAuthStore.getState().user;
      useRaceStore.getState().updatePlayer(data.playerId, { status: "LOST" });

      if (data.playerId === currentUser?.id) {
        useRaceStore.getState().setAnswer(data.answer);
        sileo.error({
          title: "Game over",
          description: `The word was ${data.answer.toUpperCase()}`,
        });
      } else {
        const loser = useRaceStore
          .getState()
          .room?.players.find((p) => p.id === data.playerId);
        sileo.success({
          title: "Opponent lost",
          description: `${loser?.username ?? "Opponent"} used all 6 guesses`,
        });
      }
    });

    socketService.on<GameOverPayload>("GAME_OVER", (data) => {
      useRaceStore.getState().setAnswer(data.answer);
      useRaceStore.getState().setRoomStatus("FINISHED");
      useRaceStore.getState().expireTimer();
      // Game is done — clear persisted room so refresh doesn't try to rejoin
      persistRoomId(null);
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
      "PLAYER_LOST",
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

  /**
   * Helper: wait for the socket to be connected and the CONNECTED ack
   * to arrive from the server, with a timeout. Returns a promise that
   * resolves once the server has confirmed the connection, or rejects
   * on timeout / error.
   */
  const ensureConnected = useCallback((): Promise<void> => {
    if (
      socketService.isConnected() &&
      useRaceStore.getState().connectionStatus === "connected"
    ) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timed out"));
      }, 10_000);

      // If not connected at all, kick off the connection
      if (!socketService.isConnected()) {
        connect();
      }

      // Wait for the server CONNECTED ack (already registered in attachListeners)
      socketService.once("CONNECTED", () => {
        clearTimeout(timeout);
        resolve();
      });

      // Also listen for errors during connection
      socketService.once("ERROR", (data: unknown) => {
        clearTimeout(timeout);
        const payload = data as { message?: string };
        reject(new Error(payload?.message ?? "Socket error during connection"));
      });

      // Handle socket-level disconnect before we get CONNECTED
      const socket = socketService.getSocket();
      if (socket) {
        socket.once("disconnect", (reason: string) => {
          clearTimeout(timeout);
          reject(new Error(`Disconnected during connection: ${reason}`));
        });
        socket.once("connect_error", (err: Error) => {
          clearTimeout(timeout);
          reject(new Error(`Connection error: ${err.message}`));
        });
      }
    });
  }, [connect]);

  /**
   * Leave the current room.  Callers (e.g. the Race page) are responsible
   * for navigating to `/race` via React Router so that `useParams` updates
   * and the auto-rejoin effect does NOT pull the user back in.
   */
  const disconnect = useCallback(() => {
    // Set the leaving guard FIRST so that any in-flight reconnect /
    // CONNECTED handler does not re-join the room we're about to leave.
    leavingRef.current = true;
    detachListeners();
    socketService.disconnect();
    useRaceStore.getState().reset();
    persistRoomId(null);
  }, [detachListeners]);

  // NOTE: We intentionally do NOT disconnect the socket on unmount.
  // React StrictMode double-mounts components (mount → unmount → mount),
  // and disconnecting here would kill the socket mid-rejoin on the first
  // cycle, leaving the second mount with a dead connection.  The socket
  // is cleaned up explicitly when the user clicks "Leave" (disconnect())
  // or when the page is fully unloaded (beforeunload).
  useEffect(() => {
    const handleBeforeUnload = () => {
      detachListeners();
      socketService.disconnect();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [detachListeners]);

  const createRoom = useCallback(async (): Promise<void> => {
    try {
      await ensureConnected();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      useRaceStore.getState().setConnectionStatus("error");
      useRaceStore.getState().setError(msg);
      sileo.error({ title: "Connection failed", description: msg });
      return;
    }

    return new Promise<void>((resolve) => {
      socketService.emit("createRoom", undefined, (response: unknown) => {
        const ack = response as WsAckResponse<RoomState>;
        if (ack?.data) {
          useRaceStore.getState().setRoom(ack.data);
          persistRoomId(ack.data.id);
          // Update URL so refresh works
          window.history.replaceState(null, "", `/race/${ack.data.id}`);
        } else {
          const msg = ack?.error ?? "Failed to create room";
          useRaceStore.getState().setError(msg);
          sileo.error({ title: "Create failed", description: msg });
        }
        resolve();
      });
    });
  }, [ensureConnected]);

  const joinRoom = useCallback(
    async (roomId: string): Promise<void> => {
      try {
        await ensureConnected();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        useRaceStore.getState().setConnectionStatus("error");
        useRaceStore.getState().setError(msg);
        sileo.error({ title: "Connection failed", description: msg });
        return;
      }

      return new Promise<void>((resolve) => {
        socketService.emit("joinRoom", { roomId }, (response: unknown) => {
          const ack = response as WsAckResponse<RoomState>;
          if (ack?.data) {
            useRaceStore.getState().setRoom(ack.data);
            persistRoomId(ack.data.id);
            // Update URL so refresh works
            window.history.replaceState(null, "", `/race/${ack.data.id}`);
          } else {
            const msg = ack?.error ?? "Failed to join room";
            useRaceStore.getState().setError(msg);
            sileo.error({ title: "Join failed", description: msg });
          }
          resolve();
        });
      });
    },
    [ensureConnected],
  );

  /** Reconnect to an active room (after socket drop or page refresh). */
  const rejoinRoom = useCallback(
    async (roomId?: string): Promise<void> => {
      try {
        await ensureConnected();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        useRaceStore.getState().setConnectionStatus("error");
        useRaceStore.getState().setError(msg);
        return;
      }

      // Try the provided roomId, then sessionStorage, then let the backend
      // look up the user's active room (no roomId arg).
      const targetRoomId = roomId || getPersistedRoomId() || undefined;

      return new Promise<void>((resolve) => {
        socketService.emit(
          "rejoinRoom",
          targetRoomId ? { roomId: targetRoomId } : undefined,
          (response: unknown) => {
            const ack = response as WsAckResponse<RoomState>;
            if (ack?.data) {
              useRaceStore.getState().setRoom(ack.data);
              persistRoomId(ack.data.id);
              // Update URL so subsequent refreshes work
              window.history.replaceState(null, "", `/race/${ack.data.id}`);
            } else if (ack?.error) {
              // No active room found — clear persisted ID
              persistRoomId(null);
              useRaceStore.getState().setError(ack.error);
            }
            resolve();
          },
        );
      });
    },
    [ensureConnected],
  );

  const submitGuess = useCallback(() => {
    const { currentGuess, guesses, room } = useRaceStore.getState();
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

    // Reject duplicate guesses on the client side
    const alreadyGuessed = guesses.some(
      (g) => g.word.toLowerCase() === currentGuess.toLowerCase(),
    );
    if (alreadyGuessed) {
      useRaceStore.getState().setError("Already guessed this word");
      sileo.error({
        title: "Duplicate guess",
        description: "You already tried this word",
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
        persistRoomId(ack.data.id);
        window.history.replaceState(null, "", `/race/${ack.data.id}`);
      } else if (ack?.error) {
        sileo.error({ title: "Rematch failed", description: ack.error });
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
          persistRoomId(ack.data.id);
          window.history.replaceState(null, "", `/race/${ack.data.id}`);
        } else if (ack?.error) {
          sileo.error({ title: "Rematch failed", description: ack.error });
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
