import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  csvFilenameFromTableName,
  downloadTableCsv,
  getTable,
  listRows,
  mutationErrorMessage,
  ROW_PAGE_SIZE,
  rowsHaveActiveComputedRuns,
  tableKeys,
  tableUpdateSchema,
  updateTable,
} from "@/lib/tables";
import { useAppHeader } from "@/ui/layouts/app-layout";
import { AddColumnDrawer } from "@/ui/components/tables/add-column-drawer";
import { HiddenColumnsMenu } from "@/ui/components/tables/hidden-columns-menu";
import { TableDataGrid } from "@/ui/components/tables/table-data-grid";
import { TableFilterBar } from "@/ui/components/tables/table-filter-bar";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowLeft01Icon, Download01Icon } from "@hugeicons/core-free-icons";

export function TableDetailPage() {
  const { tableId } = useParams();
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [activePageIndexes, setActivePageIndexes] = useState([0]);
  const [knownTotal, setKnownTotal] = useState<number | null>(null);
  const [rowsResetKey, setRowsResetKey] = useState(0);

  useEffect(() => {
    setActivePageIndexes([0]);
    setKnownTotal(null);
    setRowsResetKey((current) => current + 1);
  }, [tableId]);

  const tableQuery = useQuery({
    queryKey: tableKeys.detail(tableId ?? ""),
    queryFn: () => getTable(tableId ?? ""),
    enabled: Boolean(tableId),
  });

  const rowsQueries = useQueries({
    queries: activePageIndexes.map((pageIndex) => {
      const offset = pageIndex * ROW_PAGE_SIZE;
      return {
        queryKey: tableKeys.rows(tableId ?? "", { limit: ROW_PAGE_SIZE, offset }),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          listRows(tableId ?? "", { limit: ROW_PAGE_SIZE, offset, signal }),
        enabled: Boolean(tableId),
        // Page queries are a bounded viewport cache. Once a page leaves the
        // active window, release its rows rather than retaining all 10k records.
        gcTime: 0,
        refetchInterval: (query: { state: { data?: Awaited<ReturnType<typeof listRows>> } }) => {
          const items = query.state.data?.items;
          const columns = tableQuery.data?.columns;
          if (!items || !columns || !rowsHaveActiveComputedRuns(items, columns)) {
            return false;
          }
          return 2000;
        },
      };
    }),
  });

  const totalFromResults = rowsQueries.find((query) => query.data)?.data?.total;

  useEffect(() => {
    if (totalFromResults !== undefined) {
      setKnownTotal(totalFromResults);
    }
  }, [totalFromResults]);

  const handleVisibleRangeChange = useCallback(
    (startIndex: number, endIndex: number) => {
      if (knownTotal === null || knownTotal === 0) {
        return;
      }

      const lastPageIndex = Math.max(0, Math.ceil(knownTotal / ROW_PAGE_SIZE) - 1);
      const firstNeeded = Math.max(0, Math.floor(startIndex / ROW_PAGE_SIZE) - 1);
      const lastNeeded = Math.min(lastPageIndex, Math.floor(endIndex / ROW_PAGE_SIZE) + 1);
      const next = Array.from(
        { length: lastNeeded - firstNeeded + 1 },
        (_, index) => firstNeeded + index,
      );

      setActivePageIndexes((current) =>
        current.length === next.length && current.every((page, index) => page === next[index])
          ? current
          : next,
      );
    },
    [knownTotal],
  );

  const table = tableQuery.data;
  const total = knownTotal ?? 0;

  const exportCsv = useMutation({
    mutationFn: () =>
      downloadTableCsv(tableId ?? "", {
        fallbackFilename: csvFilenameFromTableName(table?.name ?? "table"),
      }),
  });

  useEffect(() => {
    exportCsv.reset();
  }, [tableId, exportCsv.reset]);

  const headerContent = useMemo(
    () =>
      tableId ? (
        <>
          <Link
            to="/tables"
            aria-label="Back to tables"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5" />
          </Link>

          <div className="flex min-w-0 shrink items-center gap-2">
            {tableQuery.isPending ? (
              <Skeleton className="h-4 w-32" />
            ) : table ? (
              <TableTitle tableId={table.id} name={table.name} />
            ) : (
              <span className="truncate text-sm font-medium tracking-tight text-foreground">
                Table
              </span>
            )}

            <span className="hidden shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:inline">
              {table
                ? `${table.columns.filter((column) => !column.hidden).length} cols · ${total} rows${
                    table.filters.length > 0 ? " (filtered)" : ""
                  }`
                : "Loading…"}
            </span>
          </div>

          {table && table.columns.length > 0 ? (
            <div className="ml-auto shrink-0">
              <HiddenColumnsMenu tableId={table.id} columns={table.columns} />
            </div>
          ) : null}
        </>
      ) : null,
    [table, tableId, tableQuery.isPending, total],
  );
  useAppHeader(headerContent);

  if (!tableId) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-sm text-destructive">Missing table id.</p>
      </div>
    );
  }

  const rowPages = rowsQueries.flatMap((query) => (query.data ? [query.data] : []));
  const rowsPending = knownTotal === null && rowsQueries.some((query) => query.isPending);
  const rowsError = rowsQueries.find((query) => query.isError)?.error;
  const loadError =
    mutationErrorMessage(tableQuery.error, tableQuery.isError ? "Failed to load table" : "") ||
    mutationErrorMessage(rowsError, rowsError ? "Failed to load rows" : "");

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 md:px-6">
        {table && table.columns.length > 0 ? (
          <TableFilterBar
            tableId={table.id}
            columns={table.columns}
            filters={table.filters}
            onFiltersSaved={() => {
              setActivePageIndexes([0]);
              setKnownTotal(null);
              setRowsResetKey((current) => current + 1);
            }}
          />
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {table ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportCsv.isPending}
              title={
                table.filters.length > 0
                  ? "Export filtered rows as CSV"
                  : "Export visible columns as CSV"
              }
              onClick={() => exportCsv.mutate()}
            >
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
              {exportCsv.isPending ? "Exporting…" : "Export CSV"}
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={() => setAddColumnOpen(true)}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            Add column
          </Button>
        </div>

        {loadError || exportCsv.error ? (
          <p className="basis-full text-xs text-destructive">
            {loadError || mutationErrorMessage(exportCsv.error, "Failed to export CSV")}
          </p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-1 md:px-6">
        {tableQuery.isPending || rowsPending ? (
          <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        ) : table && table.columns.length === 0 ? (
          <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 p-8">
            <p className="text-sm font-medium text-foreground">This table has no columns</p>
            <p className="text-sm text-muted-foreground">Add a column before you can add rows.</p>
          </div>
        ) : table ? (
          <TableDataGrid
            tableId={table.id}
            columns={table.columns}
            rowPages={rowPages}
            total={total}
            resetKey={rowsResetKey}
            filterActive={table.filters.length > 0}
            onVisibleRangeChange={handleVisibleRangeChange}
          />
        ) : null}
      </div>

      <AddColumnDrawer
        open={addColumnOpen}
        onOpenChange={setAddColumnOpen}
        tableId={tableId}
        columns={table?.columns ?? []}
      />
    </div>
  );
}

function TableTitle({ tableId, name }: { tableId: string; name: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(name);
    }
  }, [editing, name]);

  const rename = useMutation({
    mutationFn: (nextName: string) => updateTable(tableId, { name: nextName }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      setEditing(false);
      setError(null);
    },
  });

  function commit() {
    const parsed = tableUpdateSchema.safeParse({ name: draft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid table name");
      return;
    }
    if (parsed.data.name === name) {
      setEditing(false);
      setError(null);
      return;
    }
    rename.mutate(parsed.data.name);
  }

  if (editing) {
    return (
      <div className="flex max-w-lg flex-col gap-1">
        <Input
          value={draft}
          disabled={rename.isPending}
          className="h-6 rounded-md px-2 text-sm font-medium"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") {
              setDraft(name);
              setEditing(false);
              setError(null);
            }
          }}
          autoFocus
        />
        {error || rename.error ? (
          <p className="text-xs text-destructive">
            {error ?? mutationErrorMessage(rename.error, "Failed to rename table")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="min-w-0 max-w-64 rounded-md px-1 text-left hover:bg-muted/50"
      onClick={() => setEditing(true)}
    >
      <span className="block truncate text-sm font-medium tracking-tight text-foreground">
        {name}
      </span>
    </button>
  );
}
