export type PlayerStatus = "PLAYING" | "WON" | "LOST";
export type RoomStatus = "WAITING" | "IN_PROGRESS" | "FINISHED";

export interface RoomPlayer {
  id: string;
  username: string;
  guesses: number;
  status: PlayerStatus;
  guessColors: string[][];
}

export interface RoomState {
  id: string;
  hostId: string;
  status: RoomStatus;
  players: RoomPlayer[];
}

// WebSocket event payloads
export interface PlayerJoinedPayload {
  playerId: string;
  username: string;
}

export interface GuessResultPayload {
  playerId: string;
  guessNumber: number;
  results: string[];
}

export interface OpponentGuessPayload {
  playerId: string;
  guessNumber: number;
  colors: string[];
}

export interface PlayerWonPayload {
  playerId: string;
  guessCount: number;
}

export interface GameOverPayload {
  answer: string;
}
