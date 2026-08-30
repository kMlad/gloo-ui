import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/leads";
import { cn } from "@/lib/utils";

const STATUS_BADGE_CLASS: Record<LeadStatus, string> = {
  new: "border-border/70 bg-muted/60 text-muted-foreground",
  attempted: "border-primary/20 bg-primary/10 text-primary",
  needs_follow_up: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  meeting_booked: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  not_interested: "border-border/70 bg-muted/40 text-foreground",
  do_not_contact: "border-destructive/20 bg-destructive/10 text-destructive",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        STATUS_BADGE_CLASS[status],
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
