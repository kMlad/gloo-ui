"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { inviteUser, inviteUserSchema } from "@/lib/invite-user";
import { getInvitableRoles } from "@/lib/roles";
import { useAuth } from "@/providers/auth-context";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/ui/select";

export function InviteUserForm({ className, ...props }: React.ComponentProps<"div">) {
  const { role: inviterRole } = useAuth();
  const invitableRoles = getInvitableRoles(inviterRole);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
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

    if (!invitableRoles.some((entry) => entry.id === parsed.data.role)) {
      setValidationError("You do not have permission to invite this role");
      return;
    }

    invite.mutate(parsed.data, {
      onSuccess: () => {
        form.reset();
        setRole(null);
      },
    });
  }

  const error =
    validationError ??
    (invite.error instanceof Error
      ? invite.error.message
      : invite.isError
        ? "Failed to send invite"
        : null);
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
              <Select name="role" required value={role} onValueChange={setRole}>
                <SelectTrigger id="role" size="lg" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {invitableRoles.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
