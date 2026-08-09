import { LoginForm } from "@/components/login-form";

export function HomePage() {
  return (
    <div className="dark flex min-h-svh w-full items-center justify-center bg-background p-6 text-foreground md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
