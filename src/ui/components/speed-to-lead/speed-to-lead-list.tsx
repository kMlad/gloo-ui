import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import {
  hrefFromUrl,
  LEAD_PLATFORM_LABELS,
  leadDisplayName,
  leadPhone,
  type LeadListItem,
} from "@/lib/leads";
import { phoneEnrichmentIsActive } from "@/lib/phone-enrichments";
import { formatTableDate } from "@/lib/tables";
import { formatTimeSince, type SpeedToLeadEventItem } from "@/lib/speed-to-lead";
import { PhoneEnrichmentStatusBadge } from "@/ui/components/imports/run-status-badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/components/ui/tooltip";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Copy01Icon,
  LinkSquare02Icon,
  Loading03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

const columnHelper = createColumnHelper<TableListFeatures, SpeedToLeadEventItem>();

type SpeedToLeadListProps = {
  events: SpeedToLeadEventItem[];
  selectedLeadId: string | null;
  onSelectLead: (lead: LeadListItem) => void;
  assigneeEmails?: Record<string, string>;
  now: number;
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

function CompanyCell({ lead }: { lead: LeadListItem }) {
  const name = lead.company_name?.trim();
  const href = hrefFromUrl(lead.website) ?? hrefFromUrl(lead.company_url);

  if (!name) {
    return emptyCell(null);
  }

  if (!href) {
    return <span className="font-medium text-foreground">{name}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
      onClick={stopRowActivation}
      onKeyDown={stopRowActivation}
    >
      <span className="truncate">{name}</span>
      <HugeiconsIcon
        icon={LinkSquare02Icon}
        strokeWidth={2}
        className="size-3.5 shrink-0 text-muted-foreground"
      />
    </a>
  );
}

function PhoneCell({ event }: { event: SpeedToLeadEventItem }) {
  const phone = leadPhone(event.lead);
  const enrichment = event.enrichment ?? null;
  const enriching = enrichment ? phoneEnrichmentIsActive(enrichment.status) : false;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyPhone(clickEvent: MouseEvent<HTMLButtonElement>) {
    stopRowActivation(clickEvent);
    clickEvent.preventDefault();
    if (!phone) {
      return;
    }
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {phone ? (
        <span className="inline-flex items-center gap-1">
          <span className="tabular-nums">{phone}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={copied ? "Copied" : "Copy phone number"}
            onClick={copyPhone}
            onKeyDown={stopRowActivation}
          >
            <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} strokeWidth={2} />
          </Button>
        </span>
      ) : enriching ? (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-3.5 animate-spin" />
          Looking up…
        </span>
      ) : (
        emptyCell(null)
      )}
      {enrichment ? <PhoneEnrichmentStatusBadge status={enrichment.status} /> : null}
    </div>
  );
}

export function SpeedToLeadList({
  events,
  selectedLeadId,
  onSelectLead,
  assigneeEmails,
  now,
}: SpeedToLeadListProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("replied_at", {
          header: "Replied",
          cell: ({ getValue }) => {
            const value = getValue();
            return (
              <Tooltip>
                <TooltipTrigger
                  delay={200}
                  render={<span className="tabular-nums text-foreground" />}
                >
                  {formatTimeSince(value, now)}
                </TooltipTrigger>
                <TooltipContent>{formatTableDate(value)}</TooltipContent>
              </Tooltip>
            );
          },
        }),
        columnHelper.accessor((row) => leadDisplayName(row.lead), {
          id: "name",
          header: "Name",
          cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue()}</span>,
        }),
        columnHelper.accessor((row) => row.lead.company_name, {
          id: "company",
          header: "Company",
          cell: ({ row }) => <CompanyCell lead={row.original.lead} />,
        }),
        columnHelper.accessor("campaign_name", {
          header: "Campaign",
          cell: ({ row }) => (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-foreground">
                {emptyCell(row.original.campaign_name)}
              </span>
              <span className="text-xs text-muted-foreground">
                {LEAD_PLATFORM_LABELS[row.original.platform]}
              </span>
            </div>
          ),
        }),
        columnHelper.accessor("reply_excerpt", {
          header: "Reply",
          enableSorting: false,
          cell: ({ getValue }) => {
            const excerpt = getValue()?.trim();
            if (!excerpt) {
              return emptyCell(null);
            }
            return (
              <span className="line-clamp-2 max-w-72 text-muted-foreground" title={excerpt}>
                {excerpt}
              </span>
            );
          },
        }),
        columnHelper.display({
          id: "phone",
          header: "Phone",
          cell: ({ row }) => <PhoneCell event={row.original} />,
        }),
        ...(assigneeEmails
          ? [
              columnHelper.accessor((row) => row.lead.assigned_sdr_id ?? "", {
                id: "assignee",
                header: "Assignee",
                cell: ({ getValue }) => {
                  const sdrId = getValue();
                  if (!sdrId) {
                    return emptyCell(null);
                  }
                  return emptyCell(assigneeEmails[sdrId] ?? "Assigned");
                },
              }),
            ]
          : []),
      ]),
    [assigneeEmails, now],
  );

  const table = useTable({
    features: tableListFeatures,
    columns,
    data: events,
    getRowId: (row) => row.id,
  });

  return (
    <TooltipProvider>
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
                  data-state={row.original.lead_id === selectedLeadId ? "selected" : undefined}
                  aria-selected={row.original.lead_id === selectedLeadId}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => onSelectLead(row.original.lead)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectLead(row.original.lead);
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
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No speed-to-lead replies yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
