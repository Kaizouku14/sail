import { create } from "zustand";
import type { RoomPlayer, RoomState, RoomStatus } from "@/types/socket.types";
import type { TileStatus } from "@/types/game.types";
import { TILE_STATUS, WORD_LENGTH, MAX_GUESSES } from "@/utils/constants";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
type TimerStatus = "idle" | "running" | "expired";

interface RaceGuess {
  word: string;
  results: { letter: string; status: TileStatus }[];
}

interface RaceState {
  connectionStatus: ConnectionStatus;
  roomId: string | null;
  room: RoomState | null;
  currentGuess: string;
  guesses: RaceGuess[];
  keyboardColors: Record<string, TileStatus>;
  answer: string | null;
  error: string | null;

  // Timer
  remainingSeconds: number | null;
  timeLimit: number;
  timerStatus: TimerStatus;

  // Rematch
  rematchRoomId: string | null;
  rematchFrom: string | null;

  setConnectionStatus: (status: ConnectionStatus) => void;

  /**
   * Full room hydration — used when first entering a room (create, join,
   * rejoin).  Always overwrites everything including the timer.
   */
  setRoom: (room: RoomState) => void;

  /**
   * Lightweight room metadata update — used for in-game events like
   * PLAYER_JOINED that change status / players but must NOT reset the
   * timer if it is already running.
   */
  updateRoomMeta: (patch: Partial<RoomState>) => void;

  setRoomStatus: (status: RoomStatus) => void;
  addPlayer: (player: RoomPlayer) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, patch: Partial<RoomPlayer>) => void;

  addLetter: (letter: string) => void;
  removeLetter: () => void;
  pushGuess: (guess: RaceGuess) => void;
  setAnswer: (answer: string) => void;
  setError: (error: string | null) => void;

  // Timer actions
  setTimer: (remainingSeconds: number, timeLimit: number) => void;
  tickTimer: (remainingSeconds: number) => void;
  expireTimer: () => void;

  // Rematch actions
  setRematchOffer: (roomId: string, fromUsername: string) => void;
  clearRematchOffer: () => void;

  reset: () => void;
}

const initialState = {
  connectionStatus: "disconnected" as ConnectionStatus,
  roomId: null as string | null,
  room: null as RoomState | null,
  currentGuess: "",
  guesses: [] as RaceGuess[],
  keyboardColors: {} as Record<string, TileStatus>,
  answer: null as string | null,
  error: null as string | null,

  remainingSeconds: null as number | null,
  timeLimit: 360,
  timerStatus: "idle" as TimerStatus,

  rematchRoomId: null as string | null,
  rematchFrom: null as string | null,
};

function deriveTimerState(room: RoomState): {
  remainingSeconds: number | null;
  timeLimit: number;
  timerStatus: TimerStatus;
} {
  const remainingSeconds = room.remainingSeconds ?? null;
  const timeLimit = room.timeLimit ?? 360;
  let timerStatus: TimerStatus;

  if (remainingSeconds !== null && remainingSeconds > 0) {
    timerStatus = "running";
  } else if (room.status === "FINISHED") {
    timerStatus = "expired";
  } else {
    timerStatus = "idle";
  }

  return { remainingSeconds, timeLimit, timerStatus };
}

export const useRaceStore = create<RaceState>()((set, get) => ({
  ...initialState,

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setRoom: (room) => {
    const timer = deriveTimerState(room);
    set({
      room,
      roomId: room.id,
      error: null,
      remainingSeconds: timer.remainingSeconds,
      timeLimit: timer.timeLimit,
      timerStatus: timer.timerStatus,
      // Clear rematch state when entering a new room
      rematchRoomId: null,
      rematchFrom: null,
    });
  },

  updateRoomMeta: (patch) => {
    const { room, timerStatus } = get();
    if (!room) return;

    const updatedRoom = { ...room, ...patch };

    // If the timer is already running or expired, do NOT touch the timer
    // state — the server TIMER_START / TIMER_TICK events are authoritative.
    // Only hydrate the timer if it was idle (i.e. the game just started and
    // we haven't received TIMER_START yet).
    if (timerStatus === "idle") {
      const timer = deriveTimerState(updatedRoom);
      set({
        room: updatedRoom,
        roomId: updatedRoom.id,
        error: null,
        remainingSeconds: timer.remainingSeconds,
        timeLimit: timer.timeLimit,
        timerStatus: timer.timerStatus,
      });
    } else {
      // Keep existing timer state untouched
      set({
        room: updatedRoom,
        roomId: updatedRoom.id,
        error: null,
      });
    }
  },

  setRoomStatus: (status) => {
    const { room } = get();
    if (!room) return;
    set({ room: { ...room, status } });
  },

  addPlayer: (player) => {
    const { room } = get();
    if (!room) return;
    if (room.players.some((p) => p.id === player.id)) return;
    set({ room: { ...room, players: [...room.players, player] } });
  },

  removePlayer: (playerId) => {
    const { room } = get();
    if (!room) return;
    set({
      room: {
        ...room,
        players: room.players.filter((p) => p.id !== playerId),
      },
    });
  },

  updatePlayer: (playerId, patch) => {
    const { room } = get();
    if (!room) return;
    set({
      room: {
        ...room,
        players: room.players.map((p) =>
          p.id === playerId ? { ...p, ...patch } : p,
        ),
      },
    });
  },

  addLetter: (letter) => {
    const { currentGuess } = get();
    if (currentGuess.length >= WORD_LENGTH) return;
    set({ currentGuess: currentGuess + letter.toLowerCase(), error: null });
  },

  removeLetter: () => {
    const { currentGuess } = get();
    if (currentGuess.length === 0) return;
    set({ currentGuess: currentGuess.slice(0, -1) });
  },

  pushGuess: (guess) => {
    const { guesses, keyboardColors } = get();
    if (guesses.length >= MAX_GUESSES) return;

    const updated = { ...keyboardColors };
    guess.results.forEach(({ letter, status }) => {
      const current = updated[letter];
      if (current === TILE_STATUS.CORRECT) return;
      if (current === TILE_STATUS.PRESENT && status !== TILE_STATUS.CORRECT)
        return;
      updated[letter] = status;
    });

    set({
      guesses: [...guesses, guess],
      currentGuess: "",
      keyboardColors: updated,
    });
  },

  setAnswer: (answer) => set({ answer }),

  setError: (error) => set({ error }),

  // Timer actions
  setTimer: (remainingSeconds, timeLimit) =>
    set({ remainingSeconds, timeLimit, timerStatus: "running" }),

  tickTimer: (remainingSeconds) => {
    if (remainingSeconds <= 0) {
      set({ remainingSeconds: 0, timerStatus: "expired" });
    } else {
      set({ remainingSeconds, timerStatus: "running" });
    }
  },

  expireTimer: () => set({ remainingSeconds: 0, timerStatus: "expired" }),

  // Rematch actions
  setRematchOffer: (roomId, fromUsername) =>
    set({ rematchRoomId: roomId, rematchFrom: fromUsername }),

  clearRematchOffer: () => set({ rematchRoomId: null, rematchFrom: null }),

  reset: () => set(initialState),
}));
