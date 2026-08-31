import { useMemo, type KeyboardEvent, type MouseEvent } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { type Campaign } from "@/lib/smartlead";
import { formatTableDate } from "@/lib/tables";
import { cn } from "@/lib/utils";
import { tableListFeatures, type TableListFeatures } from "@/ui/components/tables/data-table-features";
import { Checkbox } from "@/ui/components/ui/checkbox";
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
  Cancel01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

const columnHelper = createColumnHelper<TableListFeatures, Campaign>();

type CampaignsListProps = {
  campaigns: Campaign[];
  selectedIds: number[];
  onToggle: (campaignId: number, selected: boolean) => void;
  onToggleAll: (selected: boolean) => void;
};

function emptyCell(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  return value;
}

function stopRowActivation(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
}

const CAMPAIGN_STATUS_CLASS: Record<string, string> = {
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  inprogress: "border-primary/20 bg-primary/10 text-primary",
  paused: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  stopped: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed: "border-border/70 bg-muted/40 text-foreground",
  drafted: "border-border/70 bg-muted/60 text-muted-foreground",
  draft: "border-border/70 bg-muted/60 text-muted-foreground",
  archived: "border-border/70 bg-muted/60 text-muted-foreground",
};

const CAMPAIGN_STATUS_FALLBACK_CLASS =
  "border-border/70 bg-muted/60 text-muted-foreground";

function campaignStatusKey(status: string) {
  return status.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function campaignStatusLabel(status: string) {
  const normalized = status.trim().replace(/[_-]+/g, " ");
  if (!normalized) {
    return status;
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function CampaignStatusBadge({ status }: { status: string }) {
  const key = campaignStatusKey(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        CAMPAIGN_STATUS_CLASS[key] ?? CAMPAIGN_STATUS_FALLBACK_CLASS,
      )}
    >
      {campaignStatusLabel(status)}
    </span>
  );
}

export function CampaignsList({
  campaigns,
  selectedIds,
  onToggle,
  onToggleAll,
}: CampaignsListProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = campaigns.length > 0 && campaigns.every((campaign) => selectedSet.has(campaign.smartlead_campaign_id));

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "select",
          header: () => (
            <Checkbox
              checked={allSelected}
              aria-label={allSelected ? "Deselect all campaigns" : "Select all campaigns"}
              onCheckedChange={(checked) => onToggleAll(checked === true)}
            />
          ),
          cell: ({ row }) => {
            const id = row.original.smartlead_campaign_id;
            const selected = selectedSet.has(id);
            return (
              <Checkbox
                checked={selected}
                aria-label={`Select ${row.original.name}`}
                onClick={stopRowActivation}
                onKeyDown={stopRowActivation}
                onCheckedChange={(checked) => onToggle(id, checked === true)}
              />
            );
          },
          enableSorting: false,
        }),
        columnHelper.accessor("name", {
          header: "Campaign",
          cell: ({ row }) => (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">{row.original.name}</span>
              <span className="text-xs text-muted-foreground">{row.original.smartlead_campaign_id}</span>
            </div>
          ),
        }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: ({ getValue }) => {
            const status = getValue();
            if (!status) {
              return emptyCell(null);
            }
            return <CampaignStatusBadge status={status} />;
          },
        }),
        columnHelper.accessor("ever_imported", {
          header: "Imported",
          cell: ({ row }) =>
            row.original.ever_imported ? (
              <span className="inline-flex text-emerald-600 dark:text-emerald-400" title="Imported">
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
                <span className="sr-only">Imported</span>
              </span>
            ) : (
              <span className="inline-flex text-muted-foreground" title="Not imported">
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
                <span className="sr-only">Not imported</span>
              </span>
            ),
        }),
        columnHelper.accessor("positive_lead_count", {
          header: "Positive",
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
        }),
        columnHelper.accessor("ooo_lead_count", {
          header: "OOO",
          cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
        }),
        columnHelper.accessor("last_imported_at", {
          header: "Last imported",
          cell: ({ getValue }) => {
            const value = getValue();
            return value ? formatTableDate(value) : emptyCell(null);
          },
        }),
      ]),
    [allSelected, onToggle, onToggleAll, selectedSet],
  );

  const table = useTable({
    features: tableListFeatures,
    columns,
    data: campaigns,
    getRowId: (row) => String(row.smartlead_campaign_id),
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
            table.getRowModel().rows.map((row) => {
              const selected = selectedSet.has(row.original.smartlead_campaign_id);
              return (
                <TableRow
                  key={row.id}
                  data-state={selected ? "selected" : undefined}
                  aria-selected={selected}
                  className="cursor-pointer"
                  onClick={() => onToggle(row.original.smartlead_campaign_id, !selected)}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No campaigns yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
