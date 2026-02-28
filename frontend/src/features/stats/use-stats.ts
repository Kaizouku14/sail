import { useEffect, useState } from "react";
import { authService } from "@/service/auth.service";
import { useAuthStore } from "@/store";
import type { Stats, RaceStats, RaceMatch } from "@/types/auth.types";

export interface UseStatsReturn {
  soloStats: Stats | null;
  raceStats: RaceStats | null;
  raceHistory: RaceMatch[];
  loading: boolean;
  activeTab: "solo" | "race";
  setActiveTab: (tab: "solo" | "race") => void;
}

export function useStats(): UseStatsReturn {
  const { isAuthenticated } = useAuthStore();

  const [soloStats, setSoloStats] = useState<Stats | null>(null);
  const [raceStats, setRaceStats] = useState<RaceStats | null>(null);
  const [raceHistory, setRaceHistory] = useState<RaceMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"solo" | "race">("solo");

  useEffect(() => {
    if (!isAuthenticated) return;

    const load = async () => {
      setLoading(true);
      try {
        const [solo, race, history] = await Promise.all([
          authService.getStats(),
          authService.getRaceStats(),
          authService.getRaceHistory(),
        ]);
        setSoloStats(solo);
        setRaceStats(race);
        setRaceHistory(history);
      } catch {
        // If race endpoints aren't live yet, just load solo stats
        try {
          const solo = await authService.getStats();
          setSoloStats(solo);
        } catch {
          // Silently fail
        }
      }
      setLoading(false);
    };

    void load();
  }, [isAuthenticated]);

  return {
    soloStats,
    raceStats,
    raceHistory,
    loading,
    activeTab,
    setActiveTab,
  };
}
