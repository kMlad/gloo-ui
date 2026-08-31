import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import {
  hrefFromUrl,
  leadDisplayName,
  leadPhone,
  leadSourceCampaignLabel,
  type LeadListItem,
} from "@/lib/leads";
import { LeadStatusBadge } from "@/ui/components/leads/lead-status-badge";
import { tableListFeatures, type TableListFeatures } from "@/ui/components/tables/data-table-features";
import { Button } from "@/ui/components/ui/button";
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
  Copy01Icon,
  LinkSquare02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

const columnHelper = createColumnHelper<TableListFeatures, LeadListItem>();

type LeadSelection = {
  selectedIds: string[];
  allMatching: boolean;
  onToggle: (leadId: string, selected: boolean) => void;
  onTogglePage: (selected: boolean) => void;
};

type LeadsListProps = {
  leads: LeadListItem[];
  selectedLeadId: string | null;
  onSelectLead: (lead: LeadListItem) => void;
  selection?: LeadSelection;
  showCampaigns?: boolean;
  assigneeEmails?: Record<string, string>;
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

function PhoneCell({ lead }: { lead: LeadListItem }) {
  const phone = leadPhone(lead);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  if (!phone) {
    return emptyCell(null);
  }

  async function copyPhone(event: MouseEvent<HTMLButtonElement>) {
    stopRowActivation(event);
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span>{phone}</span>
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
  );
}

export function LeadsList({
  leads,
  selectedLeadId,
  onSelectLead,
  selection,
  showCampaigns = false,
  assigneeEmails,
}: LeadsListProps) {
  const selectedSet = useMemo(
    () => new Set(selection?.selectedIds ?? []),
    [selection?.selectedIds],
  );
  const allPageSelected =
    Boolean(selection) &&
    leads.length > 0 &&
    (selection?.allMatching || leads.every((lead) => selectedSet.has(lead.id)));

  const columns = useMemo(
    () =>
      columnHelper.columns([
        ...(selection
          ? [
              columnHelper.display({
                id: "select",
                header: () => (
                  <Checkbox
                    checked={allPageSelected}
                    aria-label={allPageSelected ? "Deselect all leads on this page" : "Select all leads on this page"}
                    onCheckedChange={(checked) => selection.onTogglePage(checked === true)}
                  />
                ),
                cell: ({ row }) => {
                  const selected = selection.allMatching || selectedSet.has(row.original.id);
                  return (
                    <Checkbox
                      checked={selected}
                      aria-label={`Select ${leadDisplayName(row.original)}`}
                      onClick={stopRowActivation}
                      onKeyDown={stopRowActivation}
                      onCheckedChange={(checked) =>
                        selection.onToggle(row.original.id, checked === true)
                      }
                    />
                  );
                },
                enableSorting: false,
              }),
            ]
          : []),
        columnHelper.accessor("status", {
          header: "Status",
          cell: ({ getValue }) => <LeadStatusBadge status={getValue()} />,
        }),
        columnHelper.accessor("company_name", {
          header: "Company",
          cell: ({ row }) => <CompanyCell lead={row.original} />,
        }),
        columnHelper.accessor((row) => leadDisplayName(row), {
          id: "name",
          header: "Name",
          cell: ({ row, getValue }) => (
            <span className="font-medium text-foreground">{getValue() || row.original.email}</span>
          ),
        }),
        ...(showCampaigns
          ? [
              columnHelper.accessor((row) => leadSourceCampaignLabel(row) ?? "", {
                id: "campaigns",
                header: "Campaign",
                cell: ({ getValue }) => emptyCell(getValue()),
              }),
            ]
          : []),
        ...(assigneeEmails
          ? [
              columnHelper.accessor((row) => {
                if (!row.assigned_sdr_id) {
                  return "";
                }
                return assigneeEmails[row.assigned_sdr_id] ?? "Assigned";
              }, {
                id: "assignee",
                header: "Assignee",
                cell: ({ getValue }) => emptyCell(getValue()),
              }),
            ]
          : []),
        columnHelper.accessor("location", {
          header: "Location",
          cell: ({ getValue }) => emptyCell(getValue()),
        }),
        columnHelper.accessor((row) => leadPhone(row) ?? "", {
          id: "phone",
          header: "Phone",
          cell: ({ row }) => <PhoneCell lead={row.original} />,
        }),
      ]),
    [allPageSelected, assigneeEmails, selectedSet, selection, showCampaigns],
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
