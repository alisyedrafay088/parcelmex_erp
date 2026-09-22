import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({
  children,
  feature,
  ownerOnly,
}: {
  children: ReactNode;
  /** Feature key from config/features.ts this route requires (skip for pages open to all staff). */
  feature?: string;
  /** Route is restricted to the owner role regardless of the permission matrix (e.g. Staff & Roles). */
  ownerOnly?: boolean;
}) {
  const { user, token, loading, hasFeature } = useAuth();

  if (loading) return <div className="dashboard-status">Loading...</div>;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === "client") return <Navigate to="/portal" replace />;
  if (user.role === "rider") return <Navigate to="/rider" replace />;
  if (ownerOnly && user.role !== "owner") return <Navigate to="/" replace />;
  if (feature && !hasFeature(feature)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
