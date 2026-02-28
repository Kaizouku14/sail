import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store";
import { PageRoutes } from "@/utils/constants";
import { Ship } from "lucide-react";

const AuthLayout = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to={PageRoutes.GAME} replace />;
  }

  return (
    <div className="h-screen mx-20 border-border border-x-2 grid grid-rows-[5rem_1fr]">
      <div className="border-border border-b-2 grid grid-cols-[5rem_1fr]">
        <div className="border-border border-r-2 flex items-center justify-center">
          <Ship />
        </div>
        <div />
      </div>

      <div className="grid grid-cols-[5rem_1fr]">
        <div className="border-border border-r-2" />
        <div className="flex items-center justify-center">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
