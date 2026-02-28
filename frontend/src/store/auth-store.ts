import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/auth.types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  setUser: (user: User, token: string) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isGuest: false,

      setUser(user, token) {
        set({ user, token, isAuthenticated: true, isGuest: false });
      },

      clearUser() {
        set({ user: null, token: null, isAuthenticated: false, isGuest: true });
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
