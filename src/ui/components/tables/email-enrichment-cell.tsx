import {
  parseEmailEnrichmentCell,
  type CellValue,
} from "@/lib/tables";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  BanIcon,
  Clock01Icon,
  Loading03Icon,
  PlayIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

const cellClass =
  "flex h-6 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-xs";

type EmailEnrichmentCellProps = {
  value: CellValue;
  pending?: boolean;
  disabled?: boolean;
  onRun: () => void;
  onOpen: () => void;
};

export function EmailEnrichmentCell({
  value,
  pending = false,
  disabled = false,
  onRun,
  onOpen,
}: EmailEnrichmentCellProps) {
  const cell = parseEmailEnrichmentCell(value);
  const status = pending ? "queued" : cell?.status;

  if (status === "queued") {
    return (
      <span className={cn(cellClass, "text-muted-foreground")} aria-busy="true">
        <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3.5" />
        Queued
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className={cn(cellClass, "text-muted-foreground")} aria-busy="true">
        <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-3.5 animate-spin" />
        Running...
      </span>
    );
  }

  if (status === "waiting") {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-busy="true"
        title="Waiting for FullEnrich"
        className={cn(cellClass, "text-left text-muted-foreground hover:bg-muted/70 disabled:opacity-50")}
        onClick={(event) => {
          if (event.shiftKey) {
            return;
          }
          onOpen();
        }}
      >
        <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-3.5 shrink-0 animate-spin" />
        <span className="truncate">Waiting...</span>
      </button>
    );
  }

  if (cell?.status === "succeeded") {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cn(cellClass, "text-left hover:bg-muted/70 disabled:opacity-50")}
        onClick={(event) => {
          if (event.shiftKey) {
            return;
          }
          onOpen();
        }}
      >
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3.5 shrink-0 text-foreground" />
        <span className="truncate">{cell.email?.trim() || "Succeeded"}</span>
      </button>
    );
  }

  if (cell?.status === "failed") {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cn(cellClass, "text-left text-destructive hover:bg-muted/70 disabled:opacity-50")}
        onClick={(event) => {
          if (event.shiftKey) {
            return;
          }
          onOpen();
        }}
      >
        <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3.5 shrink-0" />
        <span className="truncate">Failed</span>
      </button>
    );
  }

  if (cell?.status === "not_found") {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cn(cellClass, "text-left text-muted-foreground hover:bg-muted/70 disabled:opacity-50")}
        onClick={(event) => {
          if (event.shiftKey) {
            return;
          }
          onOpen();
        }}
      >
        <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3.5 shrink-0" />
        <span className="truncate">Not found</span>
      </button>
    );
  }

  if (cell?.status === "skipped") {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cn(cellClass, "text-left text-muted-foreground hover:bg-muted/70 disabled:opacity-50")}
        onClick={(event) => {
          if (event.shiftKey) {
            return;
          }
          onOpen();
        }}
      >
        <HugeiconsIcon icon={BanIcon} strokeWidth={2} className="size-3.5 shrink-0" />
        <span className="truncate">Skipped</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(cellClass, "text-muted-foreground hover:bg-muted/70 disabled:opacity-50")}
      onClick={(event) => {
        if (event.shiftKey) {
          return;
        }
        onRun();
      }}
    >
      <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className="size-3.5" />
      Run
    </button>
  );
}
