import { parseEmailValidationCell, type CellValue } from "@/lib/tables";
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

const cellClass = "flex h-6 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-xs";

type EmailValidationCellProps = {
  value: CellValue;
  pending?: boolean;
  disabled?: boolean;
  onRun: () => void;
  onOpen: () => void;
};

export function EmailValidationCell({
  value,
  pending = false,
  disabled = false,
  onRun,
  onOpen,
}: EmailValidationCellProps) {
  const cell = parseEmailValidationCell(value);
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
    const outcome = outcomeFromCell(cell.valid, cell.result);
    return (
      <button
        type="button"
        disabled={disabled}
        className={cn(cellClass, "text-left hover:bg-muted/70 disabled:opacity-50", outcome.className)}
        onClick={(event) => {
          if (event.shiftKey) {
            return;
          }
          onOpen();
        }}
      >
        <HugeiconsIcon icon={outcome.icon} strokeWidth={2} className="size-3.5 shrink-0" />
        <span className="truncate">{outcome.label}</span>
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

function outcomeFromCell(valid: boolean | null | undefined, result: string | null | undefined) {
  if (result === "catch_all") {
    return {
      label: "Catch-all",
      icon: valid ? Tick02Icon : Alert02Icon,
      className: valid ? "text-foreground" : "text-muted-foreground",
    };
  }
  if (valid) {
    return { label: "Valid", icon: Tick02Icon, className: "text-foreground" };
  }
  return { label: "Invalid", icon: Alert02Icon, className: "text-destructive" };
}
