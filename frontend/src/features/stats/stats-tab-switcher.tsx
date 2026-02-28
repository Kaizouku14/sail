import { Swords } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatsTab = "solo" | "race";

interface StatsTabSwitcherProps {
  activeTab: StatsTab;
  onTabChange: (tab: StatsTab) => void;
}

const StatsTabSwitcher: React.FC<StatsTabSwitcherProps> = ({
  activeTab,
  onTabChange,
}) => (
  <div className="flex items-center gap-1 rounded-base border-2 border-border p-1 w-fit">
    <button
      onClick={() => onTabChange("solo")}
      className={cn(
        "px-4 py-1.5 rounded-base text-sm font-heading transition-colors",
        activeTab === "solo"
          ? "bg-main text-main-foreground"
          : "text-foreground/60 hover:text-foreground hover:bg-foreground/5",
      )}
    >
      Solo
    </button>
    <button
      onClick={() => onTabChange("race")}
      className={cn(
        "flex items-center gap-1.5 px-4 py-1.5 rounded-base text-sm font-heading transition-colors",
        activeTab === "race"
          ? "bg-main text-main-foreground"
          : "text-foreground/60 hover:text-foreground hover:bg-foreground/5",
      )}
    >
      <Swords className="size-3.5" />
      Race
    </button>
  </div>
);

export default StatsTabSwitcher;
