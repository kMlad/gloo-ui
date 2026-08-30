import { useMemo } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import {
  leadDisplayName,
  leadPhone,
  type LeadListItem,
} from "@/lib/leads";
import { formatTableDate } from "@/lib/tables";
import { tableListFeatures, type TableListFeatures } from "@/ui/components/tables/data-table-features";
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

const columnHelper = createColumnHelper<TableListFeatures, LeadListItem>();

type LeadsListProps = {
  leads: LeadListItem[];
  selectedLeadId: string | null;
  onSelectLead: (lead: LeadListItem) => void;
};

function emptyCell(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  return value;
}

export function LeadsList({ leads, selectedLeadId, onSelectLead }: LeadsListProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor((row) => leadDisplayName(row), {
          id: "name",
          header: "Name",
          cell: ({ row, getValue }) => (
            <span className="font-medium text-foreground">{getValue() || row.original.email}</span>
          ),
        }),
        columnHelper.accessor("email", {
          header: "Email",
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{getValue()}</span>
          ),
        }),
        columnHelper.accessor("company_name", {
          header: "Company",
          cell: ({ getValue }) => emptyCell(getValue()),
        }),
        columnHelper.accessor("location", {
          header: "Location",
          cell: ({ getValue }) => emptyCell(getValue()),
        }),
        columnHelper.accessor((row) => leadPhone(row) ?? "", {
          id: "phone",
          header: "Phone",
          cell: ({ getValue }) => emptyCell(getValue()),
        }),
        columnHelper.accessor("positive_conversation_count", {
          header: "Positive",
          cell: ({ getValue }) => getValue(),
        }),
        columnHelper.accessor("ooo_conversation_count", {
          header: "OOO",
          cell: ({ getValue }) => getValue(),
        }),
        columnHelper.accessor("latest_reply_at", {
          header: "Latest reply",
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
    data: leads,
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
                data-state={row.original.id === selectedLeadId ? "selected" : undefined}
                aria-selected={row.original.id === selectedLeadId}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => onSelectLead(row.original)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectLead(row.original);
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
                No leads yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
