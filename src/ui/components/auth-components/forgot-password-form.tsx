"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { Link } from "react-router";
import { supabase } from "@/lib/supabase";

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<"div">) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const emailValue = formData.get("email");
    const email = typeof emailValue === "string" ? emailValue : "";

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("If an account exists for that email, a reset link is on the way.");
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-2xl border border-border/70 bg-card/60 p-6 shadow-[0_24px_60px_-24px] shadow-black/60 ring-1 ring-white/5 backdrop-blur-xl">
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
                placeholder="m@example.com"
                required
                autoComplete="email"
                className="h-9 rounded-lg px-3 text-sm"
              />
            </Field>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
            <Field className="pt-1">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="h-9 w-full rounded-lg text-sm font-medium"
              >
                {isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Remembered it after all?{" "}
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
