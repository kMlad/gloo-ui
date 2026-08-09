"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { PasswordInput } from "@/ui/components/auth-components/password-input";
import { Link, useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const emailValue = formData.get("email");
    const passwordValue = formData.get("password");
    const email = typeof emailValue === "string" ? emailValue : "";
    const password = typeof passwordValue === "string" ? passwordValue : "";

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
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
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password" className="text-xs text-muted-foreground">
                  Password
                </FieldLabel>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                required
                autoComplete="current-password"
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
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
