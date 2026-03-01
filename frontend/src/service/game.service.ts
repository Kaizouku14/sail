import api from "./api";
import type {
  BackendGameState,
  BackendGuessResponse,
  BackendHintResponse,
} from "@/types/game.dto";

export const gameService = {
  async submitGuess(word: string): Promise<BackendGuessResponse> {
    const { data } = await api.post<BackendGuessResponse>("/game/guess", {
      word,
    });
    return data;
  },

  async getGameState(): Promise<BackendGameState | null> {
    try {
      const { data } = await api.get<BackendGameState>("/game/state");
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

  async requestHint(): Promise<BackendHintResponse> {
    const { data } = await api.get<BackendHintResponse>("/game/hint");
    return data;
  },

  async resetGame(): Promise<void> {
    await api.post("/game/reset");
  },
};
