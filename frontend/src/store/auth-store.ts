import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/auth.types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;

  setUser: (user: User, token: string) => void;
  setGuest: () => void;
  clearUser: () => void;
  canAccessGame: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isGuest: false,

      setUser(user, token) {
        set({ user, token, isAuthenticated: true, isGuest: false });
      },

      setGuest() {
        set({ user: null, token: null, isAuthenticated: false, isGuest: true });
      },

      clearUser() {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isGuest: false,
        });
      },

      canAccessGame() {
        const state = get();
        return state.isAuthenticated || state.isGuest;
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
