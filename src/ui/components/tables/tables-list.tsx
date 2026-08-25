import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import {
  csvFilenameFromTableName,
  deleteTable,
  downloadTableCsv,
  formatTableDate,
  mutationErrorMessage,
  tableKeys,
  type TableListItem,
} from "@/lib/tables";
import { tableListFeatures, type TableListFeatures } from "@/ui/components/tables/data-table-features";
import { ConfirmDeleteDialog } from "@/ui/components/tables/confirm-delete-dialog";
import { RenameTableDialog } from "@/ui/components/tables/rename-table-dialog";
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

const columnHelper = createColumnHelper<TableListFeatures, TableListItem>();

type TablesListProps = {
  tables: TableListItem[];
};

export function TablesList({ tables }: TablesListProps) {
  const queryClient = useQueryClient();
  const [renameTarget, setRenameTarget] = useState<TableListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TableListItem | null>(null);

  const remove = useMutation({
    mutationFn: deleteTable,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      setDeleteTarget(null);
    },
  });

  const exportCsv = useMutation({
    mutationFn: (table: TableListItem) =>
      downloadTableCsv(table.id, {
        fallbackFilename: csvFilenameFromTableName(table.name),
      }),
  });

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Name",
          cell: ({ row }) => (
            <Link
              to={`/tables/${row.original.id}`}
              className="font-medium text-foreground hover:underline"
            >
              {row.original.name}
            </Link>
          ),
        }),
        columnHelper.accessor("column_count", {
          header: "Columns",
          cell: ({ getValue }) => getValue(),
        }),
        columnHelper.accessor("row_count", {
          header: "Rows",
          cell: ({ getValue }) => getValue(),
        }),
        columnHelper.accessor("updated_at", {
          header: "Updated",
          cell: ({ getValue }) => formatTableDate(getValue()),
        }),
        columnHelper.display({
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) => (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" aria-label="Table actions" />}
                >
                  <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={exportCsv.isPending}
                    onClick={() => exportCsv.mutate(row.original)}
                  >
                    {exportCsv.isPending && exportCsv.variables?.id === row.original.id
                      ? "Exporting…"
                      : "Export CSV"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRenameTarget(row.original)}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row.original)}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ),
        }),
      ]),
    [exportCsv.isPending, exportCsv.mutate, exportCsv.variables],
  );

  const table = useTable({
    features: tableListFeatures,
    columns,
    data: tables,
    getRowId: (row) => row.id,
  });

  return (
    <>
      <div className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-left"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <table.FlexRender header={header} />
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
                      ) : (
                        <table.FlexRender header={header} />
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
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No tables yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {exportCsv.error ? (
        <p className="mt-2 text-sm text-destructive">
          {mutationErrorMessage(exportCsv.error, "Failed to export CSV")}
        </p>
      ) : null}

      <RenameTableDialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null);
          }
        }}
        tableId={renameTarget?.id ?? null}
        currentName={renameTarget?.name ?? ""}
      />

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) {
            setDeleteTarget(null);
            remove.reset();
          }
        }}
        title="Delete table"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? This removes the table, its columns, and all rows.`
            : "Delete this table?"
        }
        isPending={remove.isPending}
        error={mutationErrorMessage(remove.error, remove.isError ? "Failed to delete table" : "")}
        onConfirm={() => {
          if (deleteTarget) {
            remove.mutate(deleteTarget.id);
          }
        }}
      />
    </>
  );
}
