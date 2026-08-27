import type { ReactNode } from "react";
import {
  parseEmailValidationCell,
  type CellValue,
  type EmailValidationCellStatus,
} from "@/lib/tables";
import { Button } from "@/ui/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/ui/components/ui/drawer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  BanIcon,
  Cancel01Icon,
  Clock01Icon,
  Loading03Icon,
  Refresh01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

type EmailValidationRunDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnName: string;
  value: CellValue | undefined;
  inFlight?: "queued" | "running" | null;
  rerunPending?: boolean;
  error?: string | null;
  onRerun: () => void;
};

export function EmailValidationRunDrawer({
  open,
  onOpenChange,
  columnName,
  value,
  inFlight = null,
  rerunPending = false,
  error = null,
  onRerun,
}: EmailValidationRunDrawerProps) {
  const cell = parseEmailValidationCell(value);
  const phase = rerunPending ? "queued" : inFlight;
  const busy = phase === "queued" || phase === "running";

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="relative pr-12">
          <DrawerTitle>{columnName}</DrawerTitle>
          <DrawerDescription>Email verification result for this row.</DrawerDescription>
          <DrawerClose
            disabled={rerunPending}
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
          {busy ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {phase === "running" ? (
                <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
              ) : (
                <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4" />
              )}
              {phase === "running" ? "Running..." : "Queued"}
            </p>
          ) : (
            <>
              <Section label="Status">
                <StatusLine status={cell?.status} valid={cell?.valid} result={cell?.result} />
              </Section>

              {cell?.email ? (
                <Section label="Email">
                  <p className="truncate text-sm text-foreground">{cell.email}</p>
                </Section>
              ) : null}

              {cell?.validator || cell?.result ? (
                <Section label="Verification">
                  <p className="text-sm text-foreground">
                    {cell.validator === "millionverifier" ? "MillionVerifier" : cell.validator}
                    {cell.result ? ` · ${resultLabel(cell.result)}` : ""}
                  </p>
                </Section>
              ) : null}

              {cell?.error ? (
                <Section label="Error">
                  <p className="text-sm text-destructive">{cell.error}</p>
                </Section>
              ) : null}
            </>
          )}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DrawerFooter className="flex-row justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" disabled={busy} onClick={onRerun}>
            {busy ? (
              phase === "running" ? (
                <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" />
              ) : (
                <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
              )
            ) : (
              <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            )}
            {busy ? (phase === "running" ? "Running..." : "Queued") : "Rerun"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs text-muted-foreground">{label}</h3>
      {children}
    </section>
  );
}

function StatusLine({
  status,
  valid,
  result,
}: {
  status: EmailValidationCellStatus | undefined;
  valid: boolean | null | undefined;
  result: string | null | undefined;
}) {
  if (status === "queued") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3.5" />
        Queued
      </p>
    );
  }
  if (status === "running") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-3.5 animate-spin" />
        Running...
      </p>
    );
  }
  if (status === "succeeded") {
    if (result === "catch_all") {
      return (
        <p className={`flex items-center gap-1.5 text-sm ${valid ? "text-foreground" : "text-muted-foreground"}`}>
          <HugeiconsIcon icon={valid ? Tick02Icon : Alert02Icon} strokeWidth={2} className="size-3.5" />
          Catch-all
        </p>
      );
    }
    if (valid) {
      return (
        <p className="flex items-center gap-1.5 text-sm text-foreground">
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3.5" />
          Valid
        </p>
      );
    }
    return (
      <p className="flex items-center gap-1.5 text-sm text-destructive">
        <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3.5" />
        Invalid
      </p>
    );
  }
  if (status === "failed") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-destructive">
        <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3.5" />
        Failed
      </p>
    );
  }
  if (status === "skipped") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={BanIcon} strokeWidth={2} className="size-3.5" />
        Skipped
      </p>
    );
  }
  return <p className="text-sm text-muted-foreground">No run yet</p>;
}

function resultLabel(result: string) {
  if (result === "ok") {
    return "Valid";
  }
  if (result === "catch_all") {
    return "Catch-all";
  }
  if (result === "invalid") {
    return "Invalid";
  }
  return result;
}
