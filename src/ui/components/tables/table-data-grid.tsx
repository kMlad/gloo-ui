import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, useTable, type PaginationState } from "@tanstack/react-table";
import {
  deleteColumn,
  deleteRow,
  mutationErrorMessage,
  tableKeys,
  updateRow,
  type ColumnResponse,
  type RowResponse,
} from "@/lib/tables";
import { tableGridFeatures, type TableGridFeatures } from "@/ui/components/tables/data-table-features";
import { BooleanCell, EditableTextCell } from "@/ui/components/tables/editable-cell";
import { ConfirmDeleteDialog } from "@/ui/components/tables/confirm-delete-dialog";
import { RenameColumnDialog } from "@/ui/components/tables/rename-column-dialog";
import { Button } from "@/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";

const columnHelper = createColumnHelper<TableGridFeatures, RowResponse>();

type TableDataGridProps = {
  tableId: string;
  columns: ColumnResponse[];
  rows: RowResponse[];
  total: number;
  pagination: PaginationState;
  onPaginationChange: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void;
};

export function TableDataGrid({
  tableId,
  columns: schemaColumns,
  rows,
  total,
  pagination,
  onPaginationChange,
}: TableDataGridProps) {
  const queryClient = useQueryClient();
  const [renameColumn, setRenameColumn] = useState<ColumnResponse | null>(null);
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<ColumnResponse | null>(null);
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);

  const saveCell = useMutation({
    mutationFn: ({ rowId, columnId, value }: { rowId: string; columnId: string; value: string | boolean | null }) =>
      updateRow(tableId, rowId, { values: { [columnId]: value } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
    },
  });

  const removeColumn = useMutation({
    mutationFn: (columnId: string) => deleteColumn(tableId, columnId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      setDeleteColumnTarget(null);
    },
  });

  const removeRow = useMutation({
    mutationFn: (rowId: string) => deleteRow(tableId, rowId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      setDeleteRowId(null);
    },
  });

  const orderedColumns = useMemo(
    () => [...schemaColumns].sort((a, b) => a.position - b.position),
    [schemaColumns],
  );

  const tableColumns = useMemo(
    () =>
      columnHelper.columns([
        ...orderedColumns.map((column) =>
          columnHelper.accessor((row) => row.values[column.id] ?? null, {
            id: column.id,
            header: () => (
              <div className="flex items-center gap-1">
                <span>{column.name}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-xs" aria-label={`${column.name} column actions`} />
                    }
                  >
                    <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setRenameColumn(column)}>Rename</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteColumnTarget(column)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
            cell: ({ row, getValue }) =>
              column.type === "boolean" ? (
                <BooleanCell
                  value={getValue()}
                  disabled={saveCell.isPending}
                  onSave={(value) =>
                    saveCell.mutate({ rowId: row.original.id, columnId: column.id, value })
                  }
                />
              ) : (
                <EditableTextCell
                  value={getValue()}
                  disabled={saveCell.isPending}
                  onSave={(value) =>
                    saveCell.mutate({ rowId: row.original.id, columnId: column.id, value })
                  }
                />
              ),
          }),
        ),
        columnHelper.display({
          id: "row-actions",
          header: () => <span className="sr-only">Row actions</span>,
          cell: ({ row }) => (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" aria-label="Row actions" />}
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteRowId(row.original.id)}>
                    Delete row
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        }),
      ]),
    [orderedColumns, saveCell],
  );

  const table = useTable({
    features: tableGridFeatures,
    columns: tableColumns,
    data: rows,
    getRowId: (row) => row.id,
    manualPagination: true,
    rowCount: total,
    state: { pagination },
    onPaginationChange,
  });

  const pageCount = table.getPageCount();
  const pageIndex = table.state.pagination.pageIndex;
  const showingFrom = total === 0 ? 0 : pageIndex * pagination.pageSize + 1;
  const showingTo = Math.min(total, (pageIndex + 1) * pagination.pageSize);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-1">
                          {canSort ? (
                            <button
                              type="button"
                              className="inline-flex items-center"
                              aria-label="Sort column"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <HugeiconsIcon
                                icon={
                                  sorted === "asc"
                                    ? ArrowUp01Icon
                                    : sorted === "desc"
                                      ? ArrowDown01Icon
                                      : ArrowUpDownIcon
                                }
                                strokeWidth={2}
                                className="size-3.5 text-muted-foreground"
                              />
                            </button>
                          ) : null}
                          <table.FlexRender header={header} />
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="h-24 text-center text-muted-foreground">
                  No rows yet. Add a row to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {total === 0 ? "0 rows" : `${showingFrom}–${showingTo} of ${total} rows`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      <RenameColumnDialog
        open={renameColumn !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameColumn(null);
          }
        }}
        tableId={tableId}
        column={renameColumn}
      />

      <ConfirmDeleteDialog
        open={deleteColumnTarget !== null}
        onOpenChange={(open) => {
          if (!open && !removeColumn.isPending) {
            setDeleteColumnTarget(null);
            removeColumn.reset();
          }
        }}
        title="Delete column"
        description={
          deleteColumnTarget
            ? `Delete “${deleteColumnTarget.name}”? Values in this column will be removed.`
            : "Delete this column?"
        }
        isPending={removeColumn.isPending}
        error={mutationErrorMessage(
          removeColumn.error,
          removeColumn.isError ? "Failed to delete column" : "",
        )}
        onConfirm={() => {
          if (deleteColumnTarget) {
            removeColumn.mutate(deleteColumnTarget.id);
          }
        }}
      />

      <ConfirmDeleteDialog
        open={deleteRowId !== null}
        onOpenChange={(open) => {
          if (!open && !removeRow.isPending) {
            setDeleteRowId(null);
            removeRow.reset();
          }
        }}
        title="Delete row"
        description="Delete this row? This cannot be undone."
        isPending={removeRow.isPending}
        error={mutationErrorMessage(removeRow.error, removeRow.isError ? "Failed to delete row" : "")}
        onConfirm={() => {
          if (deleteRowId) {
            removeRow.mutate(deleteRowId);
          }
        }}
      />
    </>
  );
}
