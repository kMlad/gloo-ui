import { AuthShell } from "@/ui/components/auth-components/auth-shell";
import { InviteUserForm } from "@/ui/components/auth-components/invite-user-form";

export function InviteUserPage() {
  return (
    <AuthShell title="Invite a user" subtitle="Send an invite with a role">
      <InviteUserForm />
    </AuthShell>
  );
}
