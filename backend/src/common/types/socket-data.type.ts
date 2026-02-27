import { Socket, DefaultEventsMap } from 'socket.io';
import { JwtPayload } from './jwt-payload.type';

export interface SocketData {
  user: JwtPayload;
  roomId: string;
}

export type AuthenticatedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;
