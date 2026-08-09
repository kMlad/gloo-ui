"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import { PasswordInput } from "@/ui/components/auth-components/password-input";
import { Link, useNavigate } from "react-router";
import { supabase } from "@/lib/supabase";

export function RegisterForm({ className, ...props }: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const nameValue = formData.get("name");
    const emailValue = formData.get("email");
    const passwordValue = formData.get("password");
    const fullName = typeof nameValue === "string" ? nameValue : "";
    const email = typeof emailValue === "string" ? emailValue : "";
    const password = typeof passwordValue === "string" ? passwordValue : "";

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      void navigate("/dashboard", { replace: true });
      return;
    }

    setMessage("Check your email to confirm your account before signing in.");
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-2xl border border-border/70 bg-card/60 p-6 shadow-[0_24px_60px_-24px] shadow-black/60 ring-1 ring-white/5 backdrop-blur-xl">
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="name" className="text-xs text-muted-foreground">
                Full name
              </FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Alex Morrow"
                required
                autoComplete="name"
                className="h-9 rounded-lg px-3 text-sm"
              />
            </Field>
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
              <FieldLabel htmlFor="password" className="text-xs text-muted-foreground">
                Password
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
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
            <Field className="pt-1">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="h-9 w-full rounded-lg text-sm font-medium"
              >
                {isSubmitting ? "Creating…" : "Create account"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
