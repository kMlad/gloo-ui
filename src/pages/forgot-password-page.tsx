import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a reset link">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
