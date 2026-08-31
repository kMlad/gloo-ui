import { Navigate, Outlet } from "react-router";
import { canManageSmartlead } from "@/lib/roles";
import { useAuth } from "@/providers/auth-context";

export function SmartleadLayout() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!canManageSmartlead(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
