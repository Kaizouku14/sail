import { PageRoutes } from "@/utils/constants";
import api from "./api";
import type { AuthResponse, Stats } from "@/types/auth.types";

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
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", payload);

    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    return data;
  },

  async logout(): Promise<void> {
    localStorage.removeItem("token");
    window.location.href = PageRoutes.LOGIN;
  },

  async getStats(): Promise<Stats> {
    const { data } = await api.get<Stats>("/auth/stats");
    return data;
  },
};
