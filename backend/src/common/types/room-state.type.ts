import { PlayerStatus } from '../constants/player-status.constants';
import { RoomStatus } from '../constants/room-status.constants';

export type RoomStatusType = (typeof RoomStatus)[number];
export type PlayerStatusType = (typeof PlayerStatus)[number];

export interface Player {
  id: string;
  username: string;
  guesses: number;
  status: PlayerStatusType;
  socketId: string;
  guessColors: string[][];
}

export interface RoomState {
  id: string;
  word: string;
  hostId: string;
  players: Player[];
  status: RoomStatusType;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  timeLimit: number; // seconds (default 360 = 6 minutes)
}
