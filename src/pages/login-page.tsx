import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Gloo account">
      <LoginForm />
    </AuthShell>
  );
}
