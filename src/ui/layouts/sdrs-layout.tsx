import { Navigate, Outlet } from "react-router";
import { canManageSdrs } from "@/lib/roles";
import { useAuth } from "@/providers/auth-context";

export function SdrsLayout() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!canManageSdrs(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
