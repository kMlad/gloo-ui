import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/providers/auth-context";

export function AdminLayout() {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
