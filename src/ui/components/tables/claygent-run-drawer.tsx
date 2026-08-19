import type { ReactNode } from "react";
import {
  parseClaygentCell,
  type CellValue,
  type ClaygentCellStatus,
  type ColumnResponse,
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
  Cancel01Icon,
  Clock01Icon,
  LinkSquare02Icon,
  Loading03Icon,
  Refresh01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

type ClaygentRunDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnName: string;
  value: CellValue | undefined;
  columns: ColumnResponse[];
  columnId: string;
  inFlight?: "queued" | "running" | null;
  rerunPending?: boolean;
  error?: string | null;
  onRerun: () => void;
};

export function ClaygentRunDrawer({
  open,
  onOpenChange,
  columnName,
  value,
  columns,
  columnId,
  inFlight = null,
  rerunPending = false,
  error = null,
  onRerun,
}: ClaygentRunDrawerProps) {
  const cell = parseClaygentCell(value);
  const phase = rerunPending ? "queued" : inFlight;
  const busy = phase === "queued" || phase === "running";
  const childrenByField = new Map(
    columns
      .filter((column) => column.source_column_id === columnId && column.source_field)
      .map((column) => [column.source_field as string, column.name]),
  );
  const outputEntries = Object.entries(cell?.output ?? {});
  const sources = cell?.sources?.filter((source) => source.url) ?? [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="relative pr-12">
          <DrawerTitle>{columnName}</DrawerTitle>
          <DrawerDescription>Research result for this row.</DrawerDescription>
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
                <StatusLine status={cell?.status} />
              </Section>

              {cell?.confidence ? (
                <Section label="Confidence">
                  <p className="text-sm capitalize text-foreground">{cell.confidence}</p>
                  {cell.confidence_reason ? (
                    <p className="mt-1 text-sm text-muted-foreground">{cell.confidence_reason}</p>
                  ) : null}
                </Section>
              ) : cell?.confidence_reason ? (
                <Section label="Reasoning">
                  <p className="text-sm text-muted-foreground">{cell.confidence_reason}</p>
                </Section>
              ) : null}

              {outputEntries.length > 0 ? (
                <Section label="Outputs">
                  <dl className="flex flex-col gap-2">
                    {outputEntries.map(([key, outputValue]) => (
                      <div key={key} className="flex items-baseline justify-between gap-3">
                        <dt className="text-xs text-muted-foreground">
                          {childrenByField.get(key) ?? key}
                        </dt>
                        <dd className="truncate text-sm text-foreground">{formatOutput(outputValue)}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              ) : null}

              {sources.length > 0 ? (
                <Section label="Sources">
                  <ul className="flex flex-col gap-1.5">
                    {sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-full items-center gap-1.5 text-sm text-foreground underline-offset-4 hover:underline"
                        >
                          <HugeiconsIcon
                            icon={LinkSquare02Icon}
                            strokeWidth={2}
                            className="size-3.5 shrink-0 text-muted-foreground"
                          />
                          <span className="truncate">{source.title.trim() || source.url}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {cell?.status === "failed" && cell.error ? (
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
}: {
  status: ClaygentCellStatus | undefined;
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
  return <p className="text-sm text-muted-foreground">No run yet</p>;
}

function formatOutput(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (value == null) {
    return "Empty";
  }
  return String(value);
}
