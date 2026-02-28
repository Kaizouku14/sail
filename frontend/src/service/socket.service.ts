import { io, Socket } from "socket.io-client";
import { config } from "@/utils/config";

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    const token = localStorage.getItem("token");

    this.socket = io(`${config.wsUrl}/game`, {
      auth: { token: `Bearer ${token}` },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("WebSocket connected");
    });

    this.socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    this.socket.on("ERROR", (data: { message: string }) => {
      console.error("WebSocket error:", data.message);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  emit(event: string, payload?: unknown): void {
    if (!this.socket?.connected) {
      console.error("Socket not connected");
      return;
    }
    this.socket.emit(event, payload);
  }

  on(event: string, callback: (data: unknown) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string): void {
    this.socket?.off(event);
  }
}

export const socket = new SocketService();
