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
  if (timerStatus === "idle" || remainingSeconds === null) return null;

  const isUrgent = remainingSeconds <= 30 && timerStatus === "running";
  const isExpired = timerStatus === "expired";

  return (
    <div
      className={`flex items-center gap-2 rounded-base border-2 px-3 py-1.5 text-sm font-heading transition-colors ${
        isExpired
          ? "border-red-500/60 bg-red-500/10 text-red-400"
          : isUrgent
            ? "border-chart-2/60 bg-chart-2/10 text-chart-2 animate-pulse"
            : "border-border bg-secondary-background/30 text-foreground"
      }`}
    >
      {isExpired ? (
        <AlertTriangle className="size-3.5" />
      ) : (
        <Timer className="size-3.5" />
      )}
      <span>{isExpired ? "0:00" : formatTime(remainingSeconds)}</span>
    </div>
  );
};

export default RaceTimer;
