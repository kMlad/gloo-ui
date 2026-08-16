"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { inviteUser, inviteUserSchema } from "@/lib/invite-user";
import { roles } from "@/lib/roles";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons";

export function InviteUserForm({ className, ...props }: React.ComponentProps<"div">) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const invite = useMutation({
    mutationFn: inviteUser,
  });

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    invite.reset();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const emailValue = formData.get("email");
    const roleValue = formData.get("role");
    const email = typeof emailValue === "string" ? emailValue.trim() : "";
    const role = typeof roleValue === "string" ? roleValue : "";

    const parsed = inviteUserSchema.safeParse({ email, role });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setValidationError(firstIssue?.message ?? "Invalid invite details");
      return;
    }

    invite.mutate(parsed.data, {
      onSuccess: () => {
        form.reset();
      },
    });
  }

  const error =
    validationError ??
    (invite.error instanceof Error ? invite.error.message : invite.isError ? "Failed to send invite" : null);
  const message =
    invite.isSuccess && invite.variables ? `Invite sent to ${invite.variables.email}.` : null;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="email" className="text-xs text-muted-foreground">
                Email
              </FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="teammate@example.com"
                required
                autoComplete="email"
                className="h-9 rounded-lg px-3 text-sm"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="role" className="text-xs text-muted-foreground">
                Role
              </FieldLabel>
              <div className="relative">
                <select
                  id="role"
                  name="role"
                  required
                  defaultValue=""
                  className="h-9 w-full appearance-none rounded-lg border border-input bg-input/20 px-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30"
                >
                  <option value="" disabled>
                    Select a role
                  </option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <HugeiconsIcon
                  icon={UnfoldMoreIcon}
                  strokeWidth={2}
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </Field>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
            <Field className="pt-1">
              <Button
                type="submit"
                size="lg"
                disabled={invite.isPending}
                className="h-9 w-full rounded-lg text-sm font-medium"
              >
                {invite.isPending ? "Sending…" : "Send invite"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}
