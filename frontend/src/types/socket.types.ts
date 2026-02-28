export type PlayerStatus = "PLAYING" | "WON" | "LOST";
export type RoomStatus = "WAITING" | "IN_PROGRESS" | "FINISHED";

export const WS_EVENT = {
  CONNECTED: "CONNECTED",
  ERROR: "ERROR",
  ROOM_CREATED: "ROOM_CREATED",
  ROOM_STATE: "ROOM_STATE",
  PLAYER_JOINED: "PLAYER_JOINED",
  PLAYER_LEFT: "PLAYER_LEFT",
  GUESS_RESULT: "GUESS_RESULT",
  OPPONENT_GUESS: "OPPONENT_GUESS",
  PLAYER_WON: "PLAYER_WON",
  GAME_OVER: "GAME_OVER",
} as const;

export const WS_ACTION = {
  CREATE_ROOM: "createRoom",
  JOIN_ROOM: "joinRoom",
  SUBMIT_GUESS: "submitGuess",
} as const;

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

export interface ConnectedPayload {
  message: string;
  userId: string;
}

export interface WsErrorPayload {
  message: string;
}

export interface PlayerJoinedPayload {
  playerId: string;
  username: string;
}

export interface PlayerLeftPayload {
  playerId: string;
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

export interface JoinRoomPayload {
  roomId: string;
}

export interface SubmitGuessPayload {
  word: string;
}

export interface WsAckResponse<T = unknown> {
  event: string;
  data: T;
}
