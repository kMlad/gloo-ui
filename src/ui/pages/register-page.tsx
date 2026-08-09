import { AuthShell } from "@/ui/components/auth-components/auth-shell";
import { RegisterForm } from "@/ui/components/auth-components/register-form";

export function RegisterPage() {
  return (
    <AuthShell title="Create your account" subtitle="Start using Gloo">
      <RegisterForm />
    </AuthShell>
  );
}
