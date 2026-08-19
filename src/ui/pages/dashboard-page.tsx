import { useAuth } from "@/providers/auth-context";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  Rocket01Icon,
} from "@hugeicons/core-free-icons";

const cards = [
  {
    title: "Overview",
    description: "Your workspace at a glance. Metrics and activity will show up here.",
    icon: DashboardSquare01Icon,
  },
  {
    title: "Team",
    description: "Manage members and roles once your team starts growing.",
    icon: UserGroupIcon,
  },
  {
    title: "Getting started",
    description: "Explore the docs and ship your first feature with Gloo.",
    icon: Rocket01Icon,
  },
];

export function DashboardPage() {
  const { claims } = useAuth();
  const email = claims?.email ?? "";
  const name = email.split("@")[0] || "there";

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening in your workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon icon={card.icon} strokeWidth={2} className="size-4.5" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-base font-medium text-foreground">{card.title}</h2>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-h-40 flex-1 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 p-8">
        <p className="text-sm text-muted-foreground">
          Your dashboard content will live here.
        </p>
      </div>
    </div>
  );
}
