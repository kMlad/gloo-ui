import { IMPORT_STATUS_LABELS, type ImportStatus } from "@/lib/smartlead";
import {
  PHONE_ENRICHMENT_STATUS_LABELS,
  type PhoneEnrichmentStatus,
} from "@/lib/phone-enrichments";
import { cn } from "@/lib/utils";

const IMPORT_STATUS_CLASS: Record<ImportStatus, string> = {
  queued: "border-border/70 bg-muted/60 text-muted-foreground",
  running: "border-primary/20 bg-primary/10 text-primary",
  succeeded: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  partial: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  failed: "border-destructive/20 bg-destructive/10 text-destructive",
  rejected: "border-destructive/20 bg-destructive/10 text-destructive",
};

const ENRICHMENT_STATUS_CLASS: Record<PhoneEnrichmentStatus, string> = {
  queued: "border-border/70 bg-muted/60 text-muted-foreground",
  running: "border-primary/20 bg-primary/10 text-primary",
  waiting: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  succeeded: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  partial: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  failed: "border-destructive/20 bg-destructive/10 text-destructive",
};

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function ImportStatusBadge({ status }: { status: ImportStatus }) {
  return <StatusBadge label={IMPORT_STATUS_LABELS[status]} className={IMPORT_STATUS_CLASS[status]} />;
}

export function PhoneEnrichmentStatusBadge({ status }: { status: PhoneEnrichmentStatus }) {
  return (
    <StatusBadge
      label={PHONE_ENRICHMENT_STATUS_LABELS[status]}
      className={ENRICHMENT_STATUS_CLASS[status]}
    />
  );
}
