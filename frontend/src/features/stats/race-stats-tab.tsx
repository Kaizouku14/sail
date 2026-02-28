import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RaceStats, RaceMatch } from "@/types/auth.types";
import {
  BarChart3,
  Trophy,
  XCircle,
  Swords,
  Clock,
} from "lucide-react";
import { PageRoutes } from "@/utils/constants";
import StatCard from "./stat-card";
import RaceMatchRow from "./race-match-row";

interface RaceStatsTabProps {
  raceStats: RaceStats | null;
  raceHistory: RaceMatch[];
}

const RaceStatsTab: React.FC<RaceStatsTabProps> = ({
  raceStats,
  raceHistory,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      {raceStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Races"
            value={raceStats.totalRaces}
            icon={<Swords className="size-3.5" />}
          />
          <StatCard
            label="Win Rate"
            value={`${raceStats.winRate}%`}
            icon={<BarChart3 className="size-3.5" />}
          />
          <StatCard
            label="Wins"
            value={raceStats.wins}
            icon={<Trophy className="size-3.5" />}
          />
          <StatCard
            label="Losses"
            value={raceStats.losses}
            icon={<XCircle className="size-3.5" />}
          />
        </div>
      )}

      {!raceStats && (
        <p className="text-sm opacity-50 text-center py-4">
          Race stats not available yet
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4" />
            Recent Matches
          </CardTitle>
          <CardDescription>
            Your last {Math.min(raceHistory.length, 20)} race matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {raceHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Swords className="size-8 opacity-20" />
              <p className="text-sm opacity-50">
                No races yet — challenge a friend!
              </p>
              <Button
                variant="neutral"
                size="sm"
                onClick={() => navigate(PageRoutes.RACE)}
              >
                Start a race
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {raceHistory.map((match) => (
                <RaceMatchRow key={match.roomId} match={match} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RaceStatsTab;
