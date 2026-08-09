import { AuthShell } from "@/ui/components/auth-components/auth-shell";
import { UpdatePasswordForm } from "@/ui/components/auth-components/update-password-form";

export function UpdatePasswordPage() {
  return (
    <AuthShell title="Set a new password" subtitle="Choose something only you know">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
