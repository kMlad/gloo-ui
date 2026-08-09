import { HugeiconsIcon } from "@hugeicons/react";
import { AlphabetGreekIcon } from "@hugeicons/core-free-icons";
import { Link } from "react-router";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="dark relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background p-6 text-foreground md:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/3%)_1px,transparent_1px)] bg-size-[64px_64px] mask-[radial-gradient(ellipse_60%_60%_at_50%_45%,black,transparent)]"
      />
      <div
        aria-hidden
        className="animate-glow-drift pointer-events-none absolute -top-40 left-1/2 h-120 w-180 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.438_0.218_303.724/28%),transparent)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-56 h-105 w-140 rounded-full bg-[radial-gradient(closest-side,oklch(0.627_0.265_303.9/14%),transparent)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_50%,transparent_55%,oklch(0.1_0.01_326)_100%)]"
      />

      <div className="animate-rise-in relative w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Link to="/login" aria-label="Gloo home" className="group">
              <div className="flex size-11 items-center justify-center rounded-xl border border-border/80 bg-card/80 shadow-[0_0_24px_-6px] shadow-primary/40 ring-1 ring-white/5 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                <HugeiconsIcon icon={AlphabetGreekIcon} strokeWidth={1.8} className="size-6 text-foreground" />
              </div>
              <span className="sr-only">Gloo</span>
            </Link>
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
