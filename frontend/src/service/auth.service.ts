import api from "./api";
import type { AuthResponse, Stats } from "@/types/auth.types";
import { useAuthStore } from "@/store";

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/register", payload);

    if (data.token && data.user) {
      useAuthStore.getState().setUser(data.user, data.token);
    }

    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", payload);

    if (data.token && data.user) {
      useAuthStore.getState().setUser(data.user, data.token);
    }

    return data;
  },

  logout(): void {
    useAuthStore.getState().clearUser();
  },

  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  },

  async getStats(): Promise<Stats> {
    const { data } = await api.get<Stats>("/auth/stats");
    return data;
  },
};
