import { cn } from "@/lib/utils";

const GuessDistribution = ({
  distribution,
}: {
  distribution: Record<number, number>;
}) => {
  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-heading opacity-70">Guess Distribution</p>
      <div className="flex flex-col gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((guess) => {
          const count = distribution[guess] ?? 0;
          const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={guess} className="flex items-center gap-2">
              <span className="w-4 text-sm font-heading text-right shrink-0">
                {guess}
              </span>
              <div className="flex-1 h-7 relative">
                <div
                  className={cn(
                    "h-full rounded-sm flex items-center justify-end px-2 transition-all duration-500",
                    count > 0
                      ? "bg-chart-3 text-neutral-100"
                      : "bg-secondary-background/40 text-foreground/40",
                  )}
                  style={{ width: `${Math.max(widthPercent, 8)}%` }}
                >
                  <span className="text-xs font-heading">{count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GuessDistribution;
