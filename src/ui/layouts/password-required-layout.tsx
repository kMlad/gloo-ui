import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/providers/auth-context";

export function PasswordRequiredLayout() {
  const { mustSetPassword, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (mustSetPassword) {
    return <Navigate to="/update-password" replace />;
  }

  return <Outlet />;
}
