import { InviteUserForm } from "@/ui/components/auth-components/invite-user-form";

export function InviteUserPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
          Invite a user
        </h1>
        <p className="text-sm text-muted-foreground">
          Send an invite with a role. They&apos;ll receive an email to set their password and
          join the workspace.
        </p>
      </div>

      <InviteUserForm className="w-full max-w-md" />
    </div>
  );
}
