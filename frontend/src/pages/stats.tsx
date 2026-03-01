import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageRoutes } from "@/utils/constants";
import { useStats } from "@/features/stats/use-stats";
import { SoloStatsTab, RaceStatsTab, StatsTabSwitcher } from "@/features/stats";

const StatsPage = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const {
    soloStats,
    raceStats,
    raceHistory,
    loading,
    activeTab,
    setActiveTab,
  } = useStats();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <BarChart3 className="size-10 opacity-30" />
        <p className="text-sm opacity-60">Sign in to view your stats</p>
        <Button
          variant="neutral"
          size="sm"
          onClick={() => navigate(PageRoutes.LOGIN)}
        >
          Sign in
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin opacity-40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-2xl mx-auto px-2 sm:px-0 pb-6 sm:pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-heading">Statistics</h1>
        <p className="text-xs sm:text-sm opacity-60">
          Your solo and multiplayer performance
        </p>
      </div>

      <StatsTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "solo" && <SoloStatsTab stats={soloStats} />}

      {activeTab === "race" && (
        <RaceStatsTab raceStats={raceStats} raceHistory={raceHistory} />
      )}
    </div>
  );
};

export default StatsPage;
