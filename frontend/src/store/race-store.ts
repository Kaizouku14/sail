import { create } from "zustand";
import type { RoomPlayer, RoomState, RoomStatus } from "@/types/socket.types";
import type { TileStatus } from "@/types/game.types";
import { TILE_STATUS, WORD_LENGTH, MAX_GUESSES } from "@/utils/constants";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

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

  setConnectionStatus: (status: ConnectionStatus) => void;
  setRoom: (room: RoomState) => void;
  setRoomStatus: (status: RoomStatus) => void;
  addPlayer: (player: RoomPlayer) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, patch: Partial<RoomPlayer>) => void;

  addLetter: (letter: string) => void;
  removeLetter: () => void;
  pushGuess: (guess: RaceGuess) => void;
  setAnswer: (answer: string) => void;
  setError: (error: string | null) => void;
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
};

export const useRaceStore = create<RaceState>()((set, get) => ({
  ...initialState,

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setRoom: (room) => set({ room, roomId: room.id, error: null }),

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

  reset: () => set(initialState),
}));
