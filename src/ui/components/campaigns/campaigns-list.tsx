import { useMemo, type KeyboardEvent, type MouseEvent } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { REPLY_TYPE_LABELS, type ReplyType } from "@/lib/leads";
import {
  dedicatedImportLeadCount,
  importRunIsActive,
  type Campaign,
  type ImportRun,
} from "@/lib/smartlead";
import { formatTableDate } from "@/lib/tables";
import { ImportStatusBadge } from "@/ui/components/imports/run-status-badge";
import { CampaignStatusBadge } from "@/ui/components/campaigns/campaign-status-badge";
import {
  tableListFeatures,
  type TableListFeatures,
} from "@/ui/components/tables/data-table-features";
import { Button } from "@/ui/components/ui/button";
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
  Download01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";

const columnHelper = createColumnHelper<TableListFeatures, Campaign>();

type CampaignsListProps = {
  campaigns: Campaign[];
  selectedCampaignId: number | null;
  latestRunFor: (campaignId: number, replyType: ReplyType) => ImportRun | null;
  importing: { campaignId: number; replyType: ReplyType } | null;
  importLocked: boolean;
  onSelectCampaign: (campaign: Campaign) => void;
  onImport: (campaign: Campaign, replyType: ReplyType) => void;
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

function ReplyImportCell({
  campaign,
  replyType,
  count,
  run,
  importing,
  importLocked,
  onImport,
}: {
  campaign: Campaign;
  replyType: ReplyType;
  count: number;
  run: ImportRun | null;
  importing: { campaignId: number; replyType: ReplyType } | null;
  importLocked: boolean;
  onImport: (campaign: Campaign, replyType: ReplyType) => void;
}) {
  const isThisImport =
    importing?.campaignId === campaign.smartlead_campaign_id && importing.replyType === replyType;
  const runActive = Boolean(run && importRunIsActive(run.status));
  const busy = isThisImport || runActive;
  const disabled = busy || (importLocked && !isThisImport);

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-6 tabular-nums">{count}</span>
      {run ? <ImportStatusBadge status={run.status} /> : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled}
        aria-label={`Import ${REPLY_TYPE_LABELS[replyType].toLowerCase()} replies from ${campaign.name}`}
        onClick={(event) => {
          stopRowActivation(event);
          onImport(campaign, replyType);
        }}
        onKeyDown={stopRowActivation}
      >
        {busy ? (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" />
        ) : (
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
        )}
        {busy ? "Importing…" : run ? "Re-import" : "Import"}
      </Button>
    </div>
  );
}

export function CampaignsList({
  campaigns,
  selectedCampaignId,
  latestRunFor,
  importing,
  importLocked,
  onSelectCampaign,
  onImport,
}: CampaignsListProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Campaign",
          cell: ({ row }) => (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">{row.original.name}</span>
              <span className="text-xs text-muted-foreground">
                {row.original.smartlead_campaign_id}
              </span>
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
        columnHelper.accessor("positive_lead_count", {
          header: "Positive",
          enableSorting: false,
          cell: ({ row }) => {
            const run = latestRunFor(row.original.smartlead_campaign_id, "positive");
            return (
              <ReplyImportCell
                campaign={row.original}
                replyType="positive"
                count={dedicatedImportLeadCount(run, row.original.positive_lead_count)}
                run={run}
                importing={importing}
                importLocked={importLocked}
                onImport={onImport}
              />
            );
          },
        }),
        columnHelper.accessor("ooo_lead_count", {
          header: "OOO",
          enableSorting: false,
          cell: ({ row }) => {
            const run = latestRunFor(row.original.smartlead_campaign_id, "ooo");
            return (
              <ReplyImportCell
                campaign={row.original}
                replyType="ooo"
                count={dedicatedImportLeadCount(run, row.original.ooo_lead_count)}
                run={run}
                importing={importing}
                importLocked={importLocked}
                onImport={onImport}
              />
            );
          },
        }),
        columnHelper.accessor("last_imported_at", {
          header: "Last imported",
          cell: ({ getValue }) => {
            const value = getValue();
            return value ? formatTableDate(value) : emptyCell(null);
          },
        }),
      ]),
    [importLocked, importing, latestRunFor, onImport],
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
              const selected = row.original.smartlead_campaign_id === selectedCampaignId;
              return (
                <TableRow
                  key={row.id}
                  data-state={selected ? "selected" : undefined}
                  aria-selected={selected}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => onSelectCampaign(row.original)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectCampaign(row.original);
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
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No campaigns yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
