import api from "./api";
import type { GameState } from "@/types/game.types";

interface GuessResponse {
  results: { letter: string; status: string }[];
  status: string;
  guessesRemaining: number;
  answer?: string;
}

interface HintResponse {
  hint: string;
  hintsRemaining: number;
}

export const gameService = {
  async submitGuess(word: string): Promise<GuessResponse> {
    const { data } = await api.post<GuessResponse>("/game/guess", { word });
    return data;
  },

  async getGameState(): Promise<GameState | null> {
    try {
      const { data } = await api.get<GameState>("/game/state");
      return data;
    } catch {
      return null;
    }
  },

  async validateWord(word: string): Promise<boolean> {
    const { data } = await api.post<{ valid: boolean }>("/game/validate", {
      word,
    });
    return data.valid;
  },

  async requestHint(): Promise<HintResponse> {
    const { data } = await api.get<HintResponse>("/game/hint");
    return data;
  },
};
