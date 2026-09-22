import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function PortalProtectedRoute({ children }: { children: ReactNode }) {
  const { user, token, loading } = useAuth();

  if (loading) return <div className="dashboard-status">Loading...</div>;
  if (!token || !user) return <Navigate to="/customer/login" replace />;
  if (user.role !== "client") return <Navigate to="/" replace />;

  return <>{children}</>;
}
