import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router";
import {
  IMPORT_PAGE_SIZE,
  importKeys,
  importRunIsActive,
  listImports,
  type ImportRun,
} from "@/lib/smartlead";
import { mutationErrorMessage } from "@/lib/tables";
import { ImportRunDrawer } from "@/ui/components/imports/import-run-drawer";
import { ImportsList } from "@/ui/components/imports/imports-list";
import { Button } from "@/ui/components/ui/button";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

type ImportsLocationState = {
  selectedRunId?: string;
};

export function ImportsPage() {
  const location = useLocation();
  const [offset, setOffset] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    () => (location.state as ImportsLocationState | null)?.selectedRunId ?? null,
  );

  const listParams = useMemo(() => ({ limit: IMPORT_PAGE_SIZE, offset }), [offset]);

  const importsQuery = useQuery({
    queryKey: importKeys.list(listParams),
    queryFn: ({ signal }) => listImports({ ...listParams, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const items = query.state.data?.items;
      if (!items?.some((item) => importRunIsActive(item.status))) {
        return false;
      }
      return 2000;
    },
  });

  const items = importsQuery.data?.items ?? [];
  const total = importsQuery.data?.total ?? 0;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = offset + items.length;
  const canPrev = offset > 0;
  const canNext = offset + IMPORT_PAGE_SIZE < total;
  const error = mutationErrorMessage(
    importsQuery.error,
    importsQuery.isError ? "Failed to load imports" : "",
  );
  const selectedSummary = items.find((item) => item.id === selectedRunId) ?? null;

  function handleSelectRun(run: ImportRun) {
    setSelectedRunId(run.id);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">Imports</h1>
        <p className="text-sm text-muted-foreground">
          SmartLead import runs, progress, and phone enrichment.
        </p>
      </div>

      {importsQuery.isPending && !importsQuery.data ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : items.length === 0 ? (
        <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 p-8">
          <p className="text-sm font-medium text-foreground">No imports yet</p>
          <p className="text-sm text-muted-foreground">
            Queue campaigns from the Campaigns screen to start an import.
          </p>
        </div>
      ) : (
        <>
          <ImportsList
            runs={items}
            selectedRunId={selectedRunId}
            onSelectRun={handleSelectRun}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {pageStart}–{pageEnd} of {total}
            </p>
            {total > IMPORT_PAGE_SIZE ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canPrev || importsQuery.isFetching}
                  onClick={() => setOffset((current) => Math.max(0, current - IMPORT_PAGE_SIZE))}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canNext || importsQuery.isFetching}
                  onClick={() => setOffset((current) => current + IMPORT_PAGE_SIZE)}
                >
                  Next
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}

      <ImportRunDrawer
        open={selectedRunId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRunId(null);
          }
        }}
        runId={selectedRunId}
        summary={selectedSummary}
      />
    </div>
  );
}
