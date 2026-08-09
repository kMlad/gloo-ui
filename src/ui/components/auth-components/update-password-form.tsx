"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";

export function UpdatePasswordForm({ className, ...props }: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const passwordValue = formData.get("password");
    const confirmValue = formData.get("confirmPassword");
    const password = typeof passwordValue === "string" ? passwordValue : "";
    const confirmPassword = typeof confirmValue === "string" ? confirmValue : "";

    if (password !== confirmPassword) {
      setIsSubmitting(false);
      setError("Passwords do not match.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    void navigate("/dashboard", { replace: true });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-2xl border border-border/70 bg-card/60 p-6 shadow-[0_24px_60px_-24px] shadow-black/60 ring-1 ring-white/5 backdrop-blur-xl">
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="password" className="text-xs text-muted-foreground">
                New password
              </FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="h-9 rounded-lg px-3 text-sm"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmPassword" className="text-xs text-muted-foreground">
                Confirm password
              </FieldLabel>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="h-9 rounded-lg px-3 text-sm"
              />
            </Field>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <Field className="pt-1">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="h-9 w-full rounded-lg text-sm font-medium"
              >
                {isSubmitting ? "Updating…" : "Update password"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}
