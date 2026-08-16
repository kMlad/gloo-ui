import { Navigate } from "react-router";
import { useAuth } from "@/providers/auth-context";
import { AuthShell } from "@/ui/components/auth-components/auth-shell";
import { UpdatePasswordForm } from "@/ui/components/auth-components/update-password-form";

export function UpdatePasswordPage() {
  const { mustSetPassword, claims } = useAuth();

  if (!mustSetPassword) {
    return <Navigate to="/dashboard" replace />;
  }

  const isRecovery = claims?.amr?.some((entry) => entry.method === "recovery") ?? false;

  return (
    <AuthShell
      title={isRecovery ? "Set a new password" : "Create your password"}
      subtitle={
        isRecovery ? "Choose something only you know" : "You'll use this to sign in next time"
      }
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
