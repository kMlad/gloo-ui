import { Navigate, Outlet } from "react-router";
import { canInvite } from "@/lib/roles";
import { useAuth } from "@/providers/auth-context";

export function InviteLayout() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!canInvite(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
