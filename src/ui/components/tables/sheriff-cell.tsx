import {
  parseSheriffCell,
  type CellValue,
  type SheriffConfidence,
} from "@/lib/tables";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  Clock01Icon,
  Loading03Icon,
  PlayIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

const cellClass =
  "flex h-7 min-w-40 max-w-80 items-center gap-1.5 rounded-md px-2 text-sm";

type SheriffCellProps = {
  value: CellValue;
  pending?: boolean;
  disabled?: boolean;
  onRun: () => void;
  onOpen: () => void;
};

export function SheriffCell({
  value,
  pending = false,
  disabled = false,
  onRun,
  onOpen,
}: SheriffCellProps) {
  const cell = parseSheriffCell(value);
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
        <span className="truncate capitalize">{confidenceLabel(cell.confidence)}</span>
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

function confidenceLabel(confidence: SheriffConfidence | null | undefined) {
  if (!confidence) {
    return "Succeeded";
  }
  return confidence;
}
