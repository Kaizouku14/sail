export interface GameEvent {
  roomId: string;
  type: string;
  payload: Record<string, unknown>;
}
