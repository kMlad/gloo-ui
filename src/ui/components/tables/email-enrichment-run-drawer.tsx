import type { ReactNode } from "react";
import {
  EMAIL_PROVIDER_LABELS,
  parseEmailEnrichmentCell,
  type CellValue,
  type ComputedInFlightStatus,
  type EmailEnrichmentCellStatus,
  type EmailEnrichmentStep,
  type EmailEnrichmentStepEmail,
  type EmailProvider,
} from "@/lib/tables";
import { cn } from "@/lib/utils";
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

type EmailEnrichmentRunDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnName: string;
  value: CellValue | undefined;
  inFlight?: ComputedInFlightStatus | null;
  rerunPending?: boolean;
  error?: string | null;
  onRerun: () => void;
};

export function EmailEnrichmentRunDrawer({
  open,
  onOpenChange,
  columnName,
  value,
  inFlight = null,
  rerunPending = false,
  error = null,
  onRerun,
}: EmailEnrichmentRunDrawerProps) {
  const cell = parseEmailEnrichmentCell(value);
  const phase = rerunPending ? "queued" : inFlight;
  const busy = phase === "queued" || phase === "running" || phase === "waiting";
  const waiting = (phase ?? cell?.status) === "waiting";
  const steps = cell?.steps ?? [];
  const displaySteps =
    waiting && !steps.some((step) => step.provider === "fullenrich")
      ? [...steps, { provider: "fullenrich", status: "waiting", emails: [] }]
      : steps;
  const progressOnly = !waiting && busy && steps.length === 0;
  const rejected = cell?.rejected_emails.filter((email) => email.trim()) ?? [];
  const rejectedInSteps = new Set(
    steps.flatMap((step) => step.emails.map((item) => item.email)),
  );
  const leftoverRejected = rejected.filter((email) => !rejectedInSteps.has(email));

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="relative pr-12">
          <DrawerTitle>{columnName}</DrawerTitle>
          <DrawerDescription>Work email result for this row.</DrawerDescription>
          <DrawerClose
            disabled={rerunPending}
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
          {progressOnly ? (
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
                <StatusLine status={waiting ? "waiting" : cell?.status} />
              </Section>

              {cell?.email ? (
                <Section label="Email">
                  <p className="truncate text-sm text-foreground">{cell.email}</p>
                </Section>
              ) : null}

              {displaySteps.length > 0 ? (
                <Section label="Providers">
                  <ol className="flex flex-col gap-2">
                    {displaySteps.map((step, index) => (
                      <ProviderStep
                        key={`${step.provider}-${index}`}
                        step={step}
                        winningEmail={cell?.email}
                      />
                    ))}
                  </ol>
                </Section>
              ) : cell?.provider ? (
                <Section label="Provider">
                  <p className="text-sm text-foreground">{providerLabel(cell.provider)}</p>
                </Section>
              ) : null}

              {cell?.validator || cell?.validation_result ? (
                <Section label="Verification">
                  <p className="text-sm text-foreground">
                    {cell.validator === "millionverifier" ? "MillionVerifier" : cell.validator}
                    {cell.validation_result ? ` · ${verificationResultLabel(cell.validation_result)}` : ""}
                  </p>
                </Section>
              ) : null}

              {leftoverRejected.length > 0 ? (
                <Section label="Rejected emails">
                  <ul className="flex flex-col gap-1">
                    {leftoverRejected.map((email) => (
                      <li key={email} className="truncate text-sm text-muted-foreground">
                        {email}
                      </li>
                    ))}
                  </ul>
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
          <Button
            type="button"
            variant="outline"
            disabled={phase === "queued" || phase === "running"}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button type="button" disabled={busy} onClick={onRerun}>
            {busy ? (
              phase === "queued" ? (
                <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
              ) : (
                <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" />
              )
            ) : (
              <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
            )}
            {busy ? busyLabel(phase) : "Rerun"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ProviderStep({
  step,
  winningEmail,
}: {
  step: EmailEnrichmentStep;
  winningEmail: string | null | undefined;
}) {
  const won = Boolean(winningEmail && step.emails.some((item) => item.email === winningEmail));

  return (
    <li
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border px-3 py-2",
        won ? "border-border bg-muted/40" : "border-border/70 bg-background",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium text-foreground">{providerLabel(step.provider)}</p>
        <p className={cn("shrink-0 text-xs", stepStatusClass(step.status))}>{stepStatusLabel(step.status)}</p>
      </div>
      {step.emails.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {step.emails.map((item) => (
            <StepEmail key={`${item.email}-${item.validation}`} item={item} winning={item.email === winningEmail} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function StepEmail({ item, winning }: { item: EmailEnrichmentStepEmail; winning: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <p className={cn("truncate text-sm", winning ? "text-foreground" : "text-muted-foreground")}>{item.email}</p>
      <p className={cn("flex shrink-0 items-center gap-1 text-xs", validationClass(item.validation))}>
        <HugeiconsIcon icon={validationIcon(item.validation)} strokeWidth={2} className="size-3" />
        {validationLabel(item.validation)}
      </p>
    </li>
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

function StatusLine({ status }: { status: EmailEnrichmentCellStatus | undefined }) {
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
  if (status === "waiting") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-3.5 animate-spin" />
        Waiting for FullEnrich...
      </p>
    );
  }
  if (status === "succeeded") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-foreground">
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-3.5" />
        Succeeded
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
  if (status === "not_found") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3.5" />
        Not found
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

function busyLabel(phase: ComputedInFlightStatus | null) {
  if (phase === "running") {
    return "Running...";
  }
  if (phase === "waiting") {
    return "Waiting...";
  }
  return "Queued";
}

function providerLabel(provider: string) {
  if (provider in EMAIL_PROVIDER_LABELS) {
    return EMAIL_PROVIDER_LABELS[provider as EmailProvider];
  }
  return provider;
}

function stepStatusLabel(status: string) {
  if (status === "found") {
    return "Found";
  }
  if (status === "not_found") {
    return "Not found";
  }
  if (status === "waiting") {
    return "Waiting";
  }
  if (status === "skipped_not_configured") {
    return "Not configured";
  }
  if (status === "skipped_no_input") {
    return "Skipped";
  }
  if (status === "rate_limited") {
    return "Rate limited";
  }
  if (status === "timed_out") {
    return "Timed out";
  }
  if (status === "failed") {
    return "Failed";
  }
  return status;
}

function stepStatusClass(status: string) {
  if (status === "failed" || status === "rate_limited" || status === "timed_out") {
    return "text-destructive";
  }
  if (status === "found") {
    return "text-foreground";
  }
  return "text-muted-foreground";
}

function verificationResultLabel(result: string) {
  if (result === "ok") {
    return "Valid";
  }
  if (result === "catch_all") {
    return "Catch-all";
  }
  return result;
}

function validationLabel(validation: string) {
  if (validation === "valid") {
    return "Valid";
  }
  if (validation === "catch_all") {
    return "Catch-all";
  }
  if (validation === "invalid") {
    return "Invalid";
  }
  if (validation === "skipped") {
    return "Skipped";
  }
  if (validation === "rate_limited") {
    return "Rate limited";
  }
  if (validation === "timed_out") {
    return "Timed out";
  }
  if (validation === "failed") {
    return "Failed";
  }
  return validation;
}

function validationClass(validation: string) {
  if (validation === "valid" || validation === "catch_all") {
    return "text-foreground";
  }
  if (validation === "invalid" || validation === "failed" || validation === "rate_limited" || validation === "timed_out") {
    return "text-destructive";
  }
  return "text-muted-foreground";
}

function validationIcon(validation: string) {
  if (validation === "valid" || validation === "catch_all") {
    return Tick02Icon;
  }
  if (validation === "skipped") {
    return BanIcon;
  }
  return Alert02Icon;
}
