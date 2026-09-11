import { useMemo } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { formatSdrHours, formatSdrSlackChannel, type SdrListItem } from "@/lib/sdrs";
import {
  tableListFeatures,
  type TableListFeatures,
} from "@/ui/components/tables/data-table-features";
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

const columnHelper = createColumnHelper<TableListFeatures, SdrListItem>();

type SdrsListProps = {
  sdrs: SdrListItem[];
  selectedSdrId: string | null;
  onSelectSdr: (sdr: SdrListItem) => void;
};

export function SdrsList({ sdrs, selectedSdrId, onSelectSdr }: SdrsListProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("email", {
          header: "SDR",
          cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue()}</span>,
        }),
        columnHelper.accessor((row) => formatSdrSlackChannel(row.settings), {
          id: "slack",
          header: "Slack channel",
          enableSorting: false,
          cell: ({ getValue, row }) => (
            <span
              className={
                row.original.settings?.slack_channel_id ? "font-mono" : "text-muted-foreground"
              }
            >
              {getValue()}
            </span>
          ),
        }),
        columnHelper.accessor((row) => formatSdrHours(row.settings), {
          id: "hours",
          header: "Working hours",
          enableSorting: false,
          cell: ({ getValue, row }) => (
            <div className="flex min-w-0 flex-col">
              <span className={row.original.settings ? "text-foreground" : "text-muted-foreground"}>
                {getValue()}
              </span>
              {row.original.settings ? (
                <span className="text-xs text-muted-foreground">
                  {row.original.settings.timezone}
                </span>
              ) : null}
            </div>
          ),
        }),
      ]),
    [],
  );

  const table = useTable({
    features: tableListFeatures,
    columns,
    data: sdrs,
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
          {table.getRowModel().rows.map((row) => {
            const selected = row.original.id === selectedSdrId;
            return (
              <TableRow
                key={row.id}
                data-state={selected ? "selected" : undefined}
                aria-selected={selected}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => onSelectSdr(row.original)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectSdr(row.original);
                  }
                }}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
