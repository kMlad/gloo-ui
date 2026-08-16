"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { PasswordInput } from "@/ui/components/auth-components/password-input";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-context";

function isSamePasswordError(error: { code?: string; message: string }) {
  return (
    error.code === "same_password" ||
    error.message.toLowerCase().includes("different from the old password")
  );
}

export function UpdatePasswordForm({ className, ...props }: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const { claims, refreshClaims } = useAuth();
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

    if (updateError && !isSamePasswordError(updateError)) {
      setIsSubmitting(false);
      setError(updateError.message);
      return;
    }

    let email = claims?.email;
    if (!email) {
      const { data } = await supabase.auth.getUser();
      email = data.user?.email ?? undefined;
    }

    if (!email) {
      setIsSubmitting(false);
      setError("Could not determine your email. Try the invite or reset link again.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setIsSubmitting(false);
      setError(signInError.message);
      return;
    }

    await refreshClaims();
    setIsSubmitting(false);
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
              <PasswordInput
                id="password"
                name="password"
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
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
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
