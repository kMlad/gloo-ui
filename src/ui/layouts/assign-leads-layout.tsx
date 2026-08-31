import { Navigate, Outlet } from "react-router";
import { canAssignLeads } from "@/lib/roles";
import { useAuth } from "@/providers/auth-context";

export function AssignLeadsLayout() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!canAssignLeads(role)) {
    return <Navigate to="/leads" replace />;
  }

  return <Outlet />;
}
