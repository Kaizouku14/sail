import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "@/store";
import { gameService } from "@/service/game.service";
import { useAuthStore } from "@/store";
import { sileo } from "sileo";
import { GAME_STATUS, WORD_LENGTH } from "@/utils/constants";
import { toFrontendGuess, guessResponseToGuess } from "@/utils/helper";

export function useGame() {
  const {
    guesses,
    currentGuess,
    status,
    answer,
    guessesRemaining,
    keyboardColors,
    hint,
    hintsRemaining,
    isLoading,
    error,
    addLetter,
    removeLetter,
    setGuessResult,
    setGameStatus,
    setHint,
    setLoading,
    setError,
    resetGame,
  } = useGameStore();

  const { isAuthenticated } = useAuthStore();
  const initializedRef = useRef(false);

  // Load existing game state on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    loadGameState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGameState = useCallback(async () => {
    try {
      setLoading(true);
      const state = await gameService.getGameState();

      if (!state) {
        // No existing game — fresh board (first guess will create session)
        setLoading(false);
        return;
      }

      resetGame();

      // Replay guesses into the store so keyboard colors and board are correct
      if (state.guesses && state.guesses.length > 0) {
        for (const backendGuess of state.guesses) {
          const guess = toFrontendGuess(backendGuess);
          // Use the store's setGuessResult which also updates keyboard colors
          useGameStore.getState().setGuessResult(guess);
        }
      }

      if (state.status && state.status !== GAME_STATUS.IN_PROGRESS) {
        setGameStatus(state.status as "WON" | "LOST", state.answer);
      }

      // Restore hint count from the server so it survives refresh / navigation
      if (state.hintsRemaining !== undefined) {
        useGameStore.setState({ hintsRemaining: state.hintsRemaining });
      }

      setLoading(false);
    } catch {
      setLoading(false);
      // Silently fail — user will just see an empty board
    }
  }, [resetGame, setGameStatus, setLoading]);

  const submitGuess = useCallback(async () => {
    const current = useGameStore.getState().currentGuess;
    const gameStatus = useGameStore.getState().status;
    const existingGuesses = useGameStore.getState().guesses;

    if (gameStatus !== GAME_STATUS.IN_PROGRESS) return;

    if (current.length !== WORD_LENGTH) {
      setError("Not enough letters");
      sileo.error({
        title: "Not enough letters",
        description: `Word must be ${WORD_LENGTH} letters`,
      });
      return;
    }

    // Reject duplicate guesses on the client side
    const alreadyGuessed = existingGuesses.some(
      (g) => g.word.toLowerCase() === current.toLowerCase(),
    );
    if (alreadyGuessed) {
      setError("Already guessed this word");
      sileo.error({
        title: "Duplicate guess",
        description: "You already tried this word",
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await gameService.submitGuess(current);

      // Convert the backend response (plain string[] of statuses) into our frontend Guess shape
      const guess = guessResponseToGuess(current, result.results);

      setGuessResult(guess);
      setLoading(false);

      if (result.status === GAME_STATUS.WON) {
        setGameStatus("WON");
        sileo.success({
          title: "Congratulations!",
          description: `You guessed the word in ${useGameStore.getState().guesses.length} ${useGameStore.getState().guesses.length === 1 ? "try" : "tries"}!`,
        });
      } else if (result.status === GAME_STATUS.LOST) {
        setGameStatus("LOST", result.answer);
        sileo.error({
          title: "Game Over",
          description: `The word was "${result.answer?.toUpperCase()}"`,
        });
      }
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string }; status?: number };
      };
      const message =
        axiosError?.response?.data?.message || "Failed to submit guess";

      if (axiosError?.response?.status === 422) {
        setError("Not a valid word");
        sileo.error({
          title: "Invalid word",
          description: "That word is not in the dictionary",
        });
      } else {
        setError(message);
        sileo.error({
          title: "Error",
          description: message,
        });
      }
      setLoading(false);
    }
  }, [setGuessResult, setGameStatus, setLoading, setError]);

  const requestHint = useCallback(async () => {
    if (!isAuthenticated) {
      sileo.error({
        title: "Sign in required",
        description: "You need to be logged in to use hints",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await gameService.requestHint();
      setHint(result.hint, result.hintsRemaining);

      sileo.success({
        title: "Hint",
        description: result.hint,
      });
      setLoading(false);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string }; status?: number };
      };
      const message =
        axiosError?.response?.data?.message || "Failed to get hint";

      sileo.error({
        title: "Hint unavailable",
        description: message,
      });
      setLoading(false);
    }
  }, [isAuthenticated, setHint, setLoading]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const gameStatus = useGameStore.getState().status;
      const loading = useGameStore.getState().isLoading;

      if (gameStatus !== GAME_STATUS.IN_PROGRESS || loading) return;

      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        submitGuess();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        removeLetter();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        addLetter(e.key);
      }
    },
    [submitGuess, removeLetter, addLetter],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleKeyPress = useCallback(
    (key: string) => {
      const gameStatus = useGameStore.getState().status;
      const loading = useGameStore.getState().isLoading;

      if (gameStatus !== GAME_STATUS.IN_PROGRESS || loading) return;

      if (key === "ENTER") {
        submitGuess();
      } else if (key === "DELETE" || key === "BACKSPACE") {
        removeLetter();
      } else {
        addLetter(key);
      }
    },
    [submitGuess, removeLetter, addLetter],
  );

  const handleResetGame = useCallback(async () => {
    try {
      setLoading(true);
      await gameService.resetGame();
      resetGame();
      setLoading(false);
    } catch {
      // Even if the backend call fails, reset locally so the UI isn't stuck
      resetGame();
      setLoading(false);
    }
  }, [resetGame, setLoading]);

  return {
    // State
    guesses,
    currentGuess,
    status,
    answer,
    guessesRemaining,
    keyboardColors,
    hint,
    hintsRemaining,
    isLoading,
    error,

    // Actions
    handleKeyPress,
    submitGuess,
    requestHint,
    resetGame: handleResetGame,
    loadGameState,
  };
}
