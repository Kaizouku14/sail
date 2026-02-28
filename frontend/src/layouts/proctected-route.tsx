import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store";
import { PageRoutes } from "@/utils/constants";

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to={PageRoutes.LOGIN} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
