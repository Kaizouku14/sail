export type PlayerStatus = "PLAYING" | "WON" | "LOST";
export type RoomStatus = "WAITING" | "IN_PROGRESS" | "FINISHED";

export const WS_EVENT = {
  CONNECTED: "CONNECTED",
  ERROR: "ERROR",
  ROOM_CREATED: "ROOM_CREATED",
  ROOM_STATE: "ROOM_STATE",
  PLAYER_JOINED: "PLAYER_JOINED",
  PLAYER_LEFT: "PLAYER_LEFT",
  PLAYER_REJOINED: "PLAYER_REJOINED",
  GUESS_RESULT: "GUESS_RESULT",
  OPPONENT_GUESS: "OPPONENT_GUESS",
  PLAYER_WON: "PLAYER_WON",
  GAME_OVER: "GAME_OVER",
  TIMER_START: "TIMER_START",
  TIMER_TICK: "TIMER_TICK",
  TIME_UP: "TIME_UP",
  REMATCH_OFFER: "REMATCH_OFFER",
  REMATCH_ACCEPTED: "REMATCH_ACCEPTED",
} as const;

export const WS_ACTION = {
  CREATE_ROOM: "createRoom",
  JOIN_ROOM: "joinRoom",
  REJOIN_ROOM: "rejoinRoom",
  SUBMIT_GUESS: "submitGuess",
  REQUEST_REMATCH: "requestRematch",
  ACCEPT_REMATCH: "acceptRematch",
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
  startedAt: string | null;
  finishedAt: string | null;
  timeLimit: number;
  remainingSeconds: number | null;
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

export interface PlayerRejoinedPayload {
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
  reason?: "ALL_FINISHED" | "TIME_UP";
}

export interface TimerStartPayload {
  remainingSeconds: number;
  timeLimit: number;
}

export interface TimerTickPayload {
  remainingSeconds: number;
}

export interface TimeUpPayload {
  answer: string;
}

export interface RematchOfferPayload {
  newRoomId: string;
  fromPlayerId: string;
  fromUsername: string;
}

export interface RematchAcceptedPayload {
  newRoomId: string;
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface RejoinRoomPayload {
  roomId?: string;
}

export interface SubmitGuessPayload {
  word: string;
}

export interface RequestRematchPayload {
  roomId: string;
}

export interface AcceptRematchPayload {
  previousRoomId: string;
}

export interface WsAckResponse<T = unknown> {
  event: string;
  data: T;
}
