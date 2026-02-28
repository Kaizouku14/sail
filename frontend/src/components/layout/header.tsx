import { useAuthStore } from "@/store";
import { authService } from "@/service/auth.service";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageRoutes } from "@/utils/constants";
import { LogIn, LogOut, User } from "lucide-react";

const Header = () => {
  const { isAuthenticated, isGuest, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate(PageRoutes.LOGIN);
  };

  const handleLogin = () => {
    authService.logout();
    navigate(PageRoutes.LOGIN);
  };

  return (
    <div className="flex justify-between items-center py-4">
      <div className="text-2xl font-bold">Wordle</div>

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
