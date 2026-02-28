import { io, Socket } from "socket.io-client";
import { config } from "@/utils/config";
import { useAuthStore } from "@/store";

type SocketCallback<T = unknown> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error("Cannot connect to WebSocket without authentication");
    }

    this.socket = io(`${config.wsUrl}/game`, {
      auth: { token: `Bearer ${token}` },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("[ws] connected:", this.socket?.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[ws] disconnected:", reason);
    });

    this.socket.on("ERROR", (data: { message: string }) => {
      console.error("[ws] server error:", data.message);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  emit<T = unknown>(event: string, payload?: T, ack?: SocketCallback): void {
    if (!this.socket?.connected) {
      console.error("[ws] cannot emit — socket not connected");
      return;
    }

    if (ack) {
      this.socket.emit(event, payload, ack);
    } else {
      this.socket.emit(event, payload);
    }
  }

  on<T = unknown>(event: string, callback: SocketCallback<T>): void {
    this.socket?.on(event, callback as SocketCallback);
  }

  off(event: string, callback?: SocketCallback): void {
    if (callback) {
      this.socket?.off(event, callback as SocketCallback);
    } else {
      this.socket?.off(event);
    }
  }

  once<T = unknown>(event: string, callback: SocketCallback<T>): void {
    this.socket?.once(event, callback as SocketCallback);
  }
}

export const socketService = new SocketService();
