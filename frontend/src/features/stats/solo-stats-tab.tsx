import type { Stats } from "@/types/auth.types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Trophy, Flame, Target } from "lucide-react";
import StatCard from "./stat-card";
import GuessDistribution from "./guess-distribution";

interface SoloStatsTabProps {
  stats: Stats | null;
}

const SoloStatsTab: React.FC<SoloStatsTabProps> = ({ stats }) => {
  if (!stats) {
    return (
      <p className="text-sm opacity-50 text-center py-8">
        No solo stats available yet
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Played"
          value={stats.totalGames}
          icon={<Target className="size-3.5" />}
        />
        <StatCard
          label="Win Rate"
          value={`${stats.winRate}%`}
          icon={<BarChart3 className="size-3.5" />}
        />
        <StatCard
          label="Streak"
          value={stats.currentStreak}
          icon={<Flame className="size-3.5" />}
        />
        <StatCard
          label="Wins"
          value={stats.wins}
          icon={<Trophy className="size-3.5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guess Distribution</CardTitle>
          <CardDescription>
            How many guesses it takes you to win
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.totalGames === 0 ? (
            <p className="text-sm opacity-50 text-center py-4">
              Play a game to see your distribution
            </p>
          ) : (
            <GuessDistribution distribution={stats.guessDistribution} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SoloStatsTab;
