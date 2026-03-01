import { useState } from "react";
import { useAuthStore } from "@/store";
import { authService } from "@/service/auth.service";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageRoutes } from "@/utils/constants";
import {
  LogIn,
  LogOut,
  User,
  Swords,
  BarChart3,
  Menu,
  X,
  Ship,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
  authOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    path: PageRoutes.GAME,
    label: "Solo",
    icon: <Keyboard className="size-3.5" />,
  },
  {
    path: PageRoutes.RACE,
    label: "Race",
    icon: <Swords className="size-3.5" />,
    authOnly: true,
  },
  {
    path: PageRoutes.STATS,
    label: "Stats",
    icon: <BarChart3 className="size-3.5" />,
    authOnly: true,
  },
];

const Header = () => {
  const { isAuthenticated, isGuest, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNavigate = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    authService.logout();
    navigate(PageRoutes.LOGIN);
  };

  const handleLogin = () => {
    setMobileMenuOpen(false);
    authService.logout();
    navigate(PageRoutes.LOGIN);
  };

  const visibleNavItems = navItems.filter(
    (item) => !item.authOnly || isAuthenticated,
  );

  return (
    <header className="relative shrink-0">
      <div className="flex justify-between items-center py-3 sm:py-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <Button
            variant="noShadow"
            onClick={() => handleNavigate(PageRoutes.GAME)}
            className="flex items-center gap-2.5 bg-transparent border-none"
          >
            <div className="rounded-base border-2 border-border bg-main p-1.5 shadow-shadow">
              <Ship className="size-4 sm:size-5 text-main-foreground" />
            </div>
            <span className="text-xl sm:text-2xl font-heading text-foreground">
              Wordle
            </span>
          </Button>

          <nav className="hidden sm:flex items-center gap-1">
            {visibleNavItems.map((item) => (
              <Button
                key={item.path}
                variant="neutral"
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-base text-sm font-heading transition-colors",
                  isActive(item.path)
                    ? "bg-main/15 text-main"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5",
                )}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </nav>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated && user && (
            <>
              <div className="flex items-center gap-2 text-sm bg-secondary-background border-2 border-border py-1.5 px-4 rounded-base">
                <div className="size-6 rounded-full bg-main flex items-center justify-center">
                  <User className="size-4 text-secondary-background" />
                </div>
                <span className="font-medium">{user.username}</span>
              </div>
              <Button
                variant="neutral"
                size="sm"
                onClick={handleLogout}
                className="flex items-center h-10 gap-2"
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

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden flex items-center justify-center size-10 rounded-base border-2 border-border bg-secondary-background text-foreground"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="size-5" />
          ) : (
            <Menu className="size-5" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden absolute top-full left-0 right-0 z-50 border-2 border-border rounded-base bg-background shadow-shadow p-3 flex flex-col gap-1">
          {visibleNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-base text-sm font-heading transition-colors text-left",
                isActive(item.path)
                  ? "bg-main/15 text-main"
                  : "text-foreground/80 hover:bg-foreground/5",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <div className="h-px bg-border my-1.5" />

          {isAuthenticated && user && (
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <div className="size-6 rounded-full bg-main flex items-center justify-center">
                  <User className="size-4 text-secondary-background" />
                </div>
                <span className="font-medium">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </div>
          )}

          {isGuest && (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-base text-sm font-heading text-foreground/80 hover:bg-foreground/5 transition-colors text-left"
            >
              <LogIn className="size-4" />
              Sign in
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
