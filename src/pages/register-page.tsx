import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";

export function RegisterPage() {
  return (
    <AuthShell title="Create your account" subtitle="Start using Gloo">
      <RegisterForm />
    </AuthShell>
  );
}
