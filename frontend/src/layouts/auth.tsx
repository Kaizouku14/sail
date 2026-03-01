import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store";
import { PageRoutes } from "@/utils/constants";
import { Ship, Keyboard, Brain, Swords, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Keyboard,
    title: "Daily Puzzles",
    description: "A new word challenge every day",
  },
  {
    icon: Brain,
    title: "AI Hints",
    description: "Get smart hints when you're stuck",
  },
  {
    icon: Swords,
    title: "Multiplayer",
    description: "Race friends in real-time rooms",
  },
  {
    icon: BarChart3,
    title: "Track Stats",
    description: "Win streaks and guess distribution",
  },
];

const AuthLayout = () => {
  const { isAuthenticated, isGuest } = useAuthStore();

  if (isAuthenticated || isGuest) {
    return <Navigate to={PageRoutes.GAME} replace />;
  }

  return (
    <div className="h-dvh grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-main border-r-2 border-border p-10 text-main-foreground">
        <div className="flex items-center gap-3">
          <div className="rounded-base border-2 border-border bg-background p-2 shadow-shadow">
            <Ship className="size-6 text-foreground" />
          </div>
          <span className="text-xl font-heading">Wordle</span>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-heading leading-tight">
              Guess the word.
              <br />
              Beat the clock.
              <br />
              Challenge friends.
            </h1>
            <p className="text-sm opacity-80 max-w-sm">
              A daily word puzzle with multiplayer rooms, AI-powered hints, and
              stat tracking — all in your browser.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-base border-2 border-border bg-background/10 p-3"
              >
                <div className="rounded-base border-2 border-border bg-background/20 p-1.5 shrink-0">
                  <feature.icon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-heading leading-tight">
                    {feature.title}
                  </span>
                  <span className="text-xs opacity-70 leading-snug">
                    {feature.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs opacity-60">
          &copy; {new Date().getFullYear()} Wordle. Built for fun and learning.
        </p>
      </div>

      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center gap-3 p-6 lg:hidden">
          <div className="rounded-base border-2 border-border bg-main p-2 shadow-shadow">
            <Ship className="size-5 text-main-foreground" />
          </div>
          <span className="text-lg font-heading">Wordle</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-10 lg:pb-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
