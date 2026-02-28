import { useAuthStore } from "@/store";
import { authService } from "@/service/auth.service";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageRoutes } from "@/utils/constants";
import { LogIn, LogOut, User, Swords, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const Header = () => {
  const { isAuthenticated, isGuest, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    authService.logout();
    navigate(PageRoutes.LOGIN);
  };

  const handleLogin = () => {
    authService.logout();
    navigate(PageRoutes.LOGIN);
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="flex justify-between items-center py-4">
      <div className="flex items-center gap-6">
        <div className="text-2xl font-bold">Wordle</div>

        <nav className="flex items-center gap-1">
          <Button
            variant="neutral"
            onClick={() => navigate(PageRoutes.GAME)}
            className={cn(
              "px-3 py-1.5 rounded-base text-sm font-heading transition-colors",
              isActive(PageRoutes.GAME)
                ? "bg-main/15 text-main"
                : "text-foreground/60 hover:text-foreground hover:bg-foreground/5",
            )}
          >
            Solo
          </Button>

          {isAuthenticated && (
            <Button
              variant="neutral"
              onClick={() => navigate(PageRoutes.RACE)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-base text-sm font-heading transition-colors",
                isActive(PageRoutes.RACE)
                  ? "bg-main/15 text-main"
                  : "text-foreground/60 hover:text-foreground hover:bg-foreground/5",
              )}
            >
              <Swords className="size-3.5" />
              Race
            </Button>
          )}

          {isAuthenticated && (
            <Button
              variant="neutral"
              onClick={() => navigate(PageRoutes.STATS)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-base text-sm font-heading transition-colors",
                isActive(PageRoutes.STATS)
                  ? "bg-main/15 text-main"
                  : "text-foreground/60 hover:text-foreground hover:bg-foreground/5",
              )}
            >
              <BarChart3 className="size-3.5" />
              Stats
            </Button>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated && user && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <User className="size-4" />
              <span className="font-medium">{user.username}</span>
            </div>
            <Button
              variant="neutral"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="size-4" />
              Logout
            </Button>
          </>
        )}

        {isGuest && (
          <Button
            variant="neutral"
            size="sm"
            onClick={handleLogin}
            className="flex items-center gap-2"
          >
            <LogIn className="size-4" />
            Sign in
          </Button>
        )}
      </div>
    </div>
  );
};

export default Header;
