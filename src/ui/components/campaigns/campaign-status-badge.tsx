import { cn } from "@/lib/utils";

const CAMPAIGN_STATUS_CLASS: Record<string, string> = {
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  inprogress: "border-primary/20 bg-primary/10 text-primary",
  paused: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  stopped: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed: "border-border/70 bg-muted/40 text-foreground",
  drafted: "border-border/70 bg-muted/60 text-muted-foreground",
  draft: "border-border/70 bg-muted/60 text-muted-foreground",
  archived: "border-border/70 bg-muted/60 text-muted-foreground",
};

const CAMPAIGN_STATUS_FALLBACK_CLASS = "border-border/70 bg-muted/60 text-muted-foreground";

function campaignStatusKey(status: string) {
  return status
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function campaignStatusLabel(status: string) {
  const normalized = status.trim().replace(/[_-]+/g, " ");
  if (!normalized) {
    return status;
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

export function CampaignStatusBadge({ status }: { status: string }) {
  const key = campaignStatusKey(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        CAMPAIGN_STATUS_CLASS[key] ?? CAMPAIGN_STATUS_FALLBACK_CLASS,
      )}
    >
      {campaignStatusLabel(status)}
    </span>
  );
}
