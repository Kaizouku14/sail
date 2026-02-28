import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store";
import { PageRoutes } from "@/utils/constants";

const ProtectedRoute = () => {
  const canAccessGame = useAuthStore((state) => state.canAccessGame);

  if (!canAccessGame()) {
    return <Navigate to={PageRoutes.LOGIN} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
