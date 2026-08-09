import { AuthShell } from "@/ui/components/auth-components/auth-shell";
import { LoginForm } from "@/ui/components/auth-components/login-form";

export function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Gloo account">
      <LoginForm />
    </AuthShell>
  );
}
