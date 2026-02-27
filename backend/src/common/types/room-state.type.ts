import { playerStatus } from '../constants/player-status.constants';
import { roomStatus } from '../constants/room-status.constants';

export type RoomStatusType = (typeof roomStatus)[number];
export type PlayerStatusType = (typeof playerStatus)[number];

export interface Player {
  id: string;
  username: string;
  guesses: number;
  status: PlayerStatusType;
  socketId: string;
}

export interface RoomState {
  id: string;
  word: string;
  hostId: string;
  players: Player[];
  status: RoomStatusType;
  createdAt: Date;
}
