import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types/driver";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { userId, role } = useAuth();

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  if (roles && role && !roles.includes(role)) {
    return <Navigate to={role === "conductor" ? "/conductor" : "/"} replace />;
  }

  return <Outlet />;
}
