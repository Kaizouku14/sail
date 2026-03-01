import { useEffect, useState, useRef } from "react";
import { AlertTriangle, Timer } from "lucide-react";

/** Formats seconds into M:SS display. */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface RaceTimerProps {
  remainingSeconds: number | null;
  timerStatus: "idle" | "running" | "expired";
}

const RaceTimer: React.FC<RaceTimerProps> = ({
  remainingSeconds,
  timerStatus,
}) => {
  // Local display seconds that count down every second on the client side.
  // The server TIMER_TICK events periodically correct this value, but between
  // ticks we decrement locally so the UI updates smoothly every second.
  const [displaySeconds, setDisplaySeconds] = useState<number | null>(
    remainingSeconds,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync local display when the server sends an authoritative value
  useEffect(() => {
    if (remainingSeconds !== null) {
      setDisplaySeconds(remainingSeconds);
    }
  }, [remainingSeconds]);

  // Run a local 1-second countdown when the timer is running
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timerStatus !== "running" || displaySeconds === null) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setDisplaySeconds((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Only restart the interval when timerStatus changes, not on every displaySeconds change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerStatus]);

  if (timerStatus === "idle" || displaySeconds === null) return null;

  const isUrgent = displaySeconds <= 30 && timerStatus === "running";
  const isExpired = timerStatus === "expired" || displaySeconds <= 0;

  return (
    <div
      className={`flex items-center gap-1.5 sm:gap-2 rounded-base border-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-heading transition-colors ${
        isExpired
          ? "border-red-500/60 bg-red-500/10 text-red-400"
          : isUrgent
            ? "border-chart-2/60 bg-chart-2/10 text-chart-2 animate-pulse"
            : "border-border bg-secondary-background/30 text-foreground"
      }`}
    >
      {isExpired ? (
        <AlertTriangle className="size-3 sm:size-3.5" />
      ) : (
        <Timer className="size-3 sm:size-3.5" />
      )}
      <span>{isExpired ? "0:00" : formatTime(displaySeconds)}</span>
    </div>
  );
};

export default RaceTimer;
