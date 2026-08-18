import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import {
  addRow,
  deleteTable,
  getTable,
  listRows,
  mutationErrorMessage,
  ROW_PAGE_SIZE,
  tableKeys,
  tableUpdateSchema,
  updateTable,
} from "@/lib/tables";
import { AddColumnDialog } from "@/ui/components/tables/add-column-dialog";
import { ConfirmDeleteDialog } from "@/ui/components/tables/confirm-delete-dialog";
import { HiddenColumnsMenu } from "@/ui/components/tables/hidden-columns-menu";
import { TableDataGrid } from "@/ui/components/tables/table-data-grid";
import { TableFilterBar } from "@/ui/components/tables/table-filter-bar";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export function TableDetailPage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: ROW_PAGE_SIZE,
  });

  useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: ROW_PAGE_SIZE });
  }, [tableId]);

  const offset = pagination.pageIndex * pagination.pageSize;

  const tableQuery = useQuery({
    queryKey: tableKeys.detail(tableId ?? ""),
    queryFn: () => getTable(tableId ?? ""),
    enabled: Boolean(tableId),
  });

  const rowsQuery = useQuery({
    queryKey: tableKeys.rows(tableId ?? "", { limit: pagination.pageSize, offset }),
    queryFn: () => listRows(tableId ?? "", { limit: pagination.pageSize, offset }),
    enabled: Boolean(tableId),
  });

  const createRow = useMutation({
    mutationFn: () => addRow(tableId ?? "", {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId ?? "") });
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      setPagination((current) => {
        const lastIndex = Math.max(0, Math.ceil((total + 1) / current.pageSize) - 1);
        return { ...current, pageIndex: lastIndex };
      });
    },
  });

  const removeTable = useMutation({
    mutationFn: () => deleteTable(tableId ?? ""),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      void navigate("/tables");
    },
  });

  if (!tableId) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-sm text-destructive">Missing table id.</p>
      </div>
    );
  }

  const table = tableQuery.data;
  const rows = rowsQuery.data?.items ?? [];
  const total = rowsQuery.data?.total ?? 0;
  const loadError =
    mutationErrorMessage(tableQuery.error, tableQuery.isError ? "Failed to load table" : "") ||
    mutationErrorMessage(rowsQuery.error, rowsQuery.isError ? "Failed to load rows" : "");
  const actionError =
    mutationErrorMessage(createRow.error, createRow.isError ? "Failed to add row" : "") ||
    mutationErrorMessage(removeTable.error, removeTable.isError ? "Failed to delete table" : "");

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-4">
        <Link
          to="/tables"
          className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5" />
          Tables
        </Link>

        {tableQuery.isPending ? (
          <Skeleton className="h-8 w-48" />
        ) : table ? (
          <TableTitle tableId={table.id} name={table.name} />
        ) : (
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">Table</h1>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {table
              ? `${table.columns.filter((column) => !column.hidden).length} columns · ${total} rows${
                  table.filters.length > 0 ? " (filtered)" : ""
                }`
              : "Loading schema and rows."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setAddColumnOpen(true)}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
              Add column
            </Button>
            <Button
              type="button"
              disabled={!table || table.columns.length === 0 || createRow.isPending}
              onClick={() => createRow.mutate()}
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
              {createRow.isPending ? "Adding…" : "Add row"}
            </Button>
            <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete table
            </Button>
          </div>
        </div>
      </div>

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      {table && table.columns.length > 0 ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <TableFilterBar
            tableId={table.id}
            columns={table.columns}
            filters={table.filters}
            onFiltersSaved={() => setPagination((current) => ({ ...current, pageIndex: 0 }))}
          />
          <HiddenColumnsMenu tableId={table.id} columns={table.columns} />
        </div>
      ) : null}

      {tableQuery.isPending || rowsQuery.isPending ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : table && table.columns.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 p-8">
          <p className="text-sm font-medium text-foreground">This table has no columns</p>
          <p className="text-sm text-muted-foreground">Add a column before you can add rows.</p>
        </div>
      ) : table ? (
        <TableDataGrid
          tableId={table.id}
          columns={table.columns}
          rows={rows}
          total={total}
          pagination={pagination}
          filterActive={table.filters.length > 0}
          onPaginationChange={setPagination}
        />
      ) : null}

      <AddColumnDialog open={addColumnOpen} onOpenChange={setAddColumnOpen} tableId={tableId} />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !removeTable.isPending) {
            setDeleteOpen(false);
            removeTable.reset();
          }
        }}
        title="Delete table"
        description={
          table
            ? `Delete “${table.name}”? This removes the table, its columns, and all rows.`
            : "Delete this table?"
        }
        isPending={removeTable.isPending}
        error={mutationErrorMessage(
          removeTable.error,
          removeTable.isError ? "Failed to delete table" : "",
        )}
        onConfirm={() => removeTable.mutate()}
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
          className="h-10 rounded-lg px-3 text-lg font-semibold"
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
      className="w-fit rounded-md text-left hover:bg-muted/50"
      onClick={() => setEditing(true)}
    >
      <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
    </button>
  );
}
