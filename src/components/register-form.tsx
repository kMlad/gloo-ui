"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "react-router";

export function RegisterForm({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-2xl border border-border/70 bg-card/60 p-6 shadow-[0_24px_60px_-24px] shadow-black/60 ring-1 ring-white/5 backdrop-blur-xl">
        <form>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="name" className="text-xs text-muted-foreground">
                Full name
              </FieldLabel>
              <Input
                id="name"
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
              <Input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                className="h-9 rounded-lg px-3 text-sm"
              />
            </Field>
            <Field className="pt-1">
              <Button type="submit" size="lg" className="h-9 w-full rounded-lg text-sm font-medium">
                Create account
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
