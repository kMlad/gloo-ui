import { useMemo } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { REPLY_TYPE_LABELS } from "@/lib/leads";
import { type ImportRun } from "@/lib/smartlead";
import { formatTableDate } from "@/lib/tables";
import { tableListFeatures, type TableListFeatures } from "@/ui/components/tables/data-table-features";
import { ImportStatusBadge } from "@/ui/components/imports/run-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon } from "@hugeicons/core-free-icons";

const columnHelper = createColumnHelper<TableListFeatures, ImportRun>();

type ImportsListProps = {
  runs: ImportRun[];
  selectedRunId: string | null;
  onSelectRun: (run: ImportRun) => void;
};

function emptyCell(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  return value;
}

export function ImportsList({ runs, selectedRunId, onSelectRun }: ImportsListProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("status", {
          header: "Status",
          cell: ({ getValue }) => <ImportStatusBadge status={getValue()} />,
        }),
        columnHelper.accessor("campaign_ids", {
          header: "Campaigns",
          cell: ({ getValue }) => {
            const ids = getValue();
            if (ids.length === 0) {
              return emptyCell(null);
            }
            return (
              <span className="tabular-nums" title={ids.join(", ")}>
                {ids.length === 1 ? ids[0] : `${ids.length} campaigns`}
              </span>
            );
          },
        }),
        columnHelper.accessor("reply_types", {
          header: "Reply types",
          cell: ({ getValue }) =>
            getValue()
              .map((type) => REPLY_TYPE_LABELS[type])
              .join(", "),
        }),
        columnHelper.accessor("leads_processed", {
          header: "Leads",
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
        }),
        columnHelper.accessor("conversations_processed", {
          header: "Conversations",
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
        }),
        columnHelper.accessor("replies_processed", {
          header: "Replies",
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
        }),
        columnHelper.accessor("started_at", {
          header: "Started",
          cell: ({ getValue }) => formatTableDate(getValue()),
        }),
        columnHelper.accessor("completed_at", {
          header: "Completed",
          cell: ({ getValue }) => {
            const value = getValue();
            return value ? formatTableDate(value) : emptyCell(null);
          },
        }),
      ]),
    [],
  );

  const table = useTable({
    features: tableListFeatures,
    columns,
    data: runs,
    getRowId: (row) => row.id,
  });

  return (
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
              <TableRow
                key={row.id}
                data-state={row.original.id === selectedRunId ? "selected" : undefined}
                aria-selected={row.original.id === selectedRunId}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => onSelectRun(row.original)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectRun(row.original);
                  }
                }}
              >
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
                No imports yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
