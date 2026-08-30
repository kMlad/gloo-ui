import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  LEAD_PAGE_SIZE,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  leadKeys,
  listLeads,
  REPLY_TYPE_LABELS,
  type LeadListItem,
  type LeadStatus,
  type ReplyType,
} from "@/lib/leads";
import { mutationErrorMessage } from "@/lib/tables";
import { cn } from "@/lib/utils";
import { LeadDetailDrawer } from "@/ui/components/leads/lead-detail-drawer";
import { LeadsList } from "@/ui/components/leads/leads-list";
import { Button } from "@/ui/components/ui/button";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";

const nativeSelectClass =
  "h-9 appearance-none rounded-lg border border-input bg-input/20 px-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30";

export function LeadsPage() {
  const [offset, setOffset] = useState(0);
  const [replyType, setReplyType] = useState<ReplyType | null>(null);
  const [status, setStatus] = useState<LeadStatus | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadListItem | null>(null);

  const listParams = useMemo(
    () => ({ limit: LEAD_PAGE_SIZE, offset, replyType, status }),
    [offset, replyType, status],
  );

  const leadsQuery = useQuery({
    queryKey: leadKeys.list(listParams),
    queryFn: ({ signal }) => listLeads({ ...listParams, signal }),
    placeholderData: keepPreviousData,
  });

  const items = leadsQuery.data?.items ?? [];
  const total = leadsQuery.data?.total ?? 0;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = offset + items.length;
  const canPrev = offset > 0;
  const canNext = offset + LEAD_PAGE_SIZE < total;
  const error = mutationErrorMessage(
    leadsQuery.error,
    leadsQuery.isError ? "Failed to load leads" : "",
  );

  function handleReplyTypeChange(value: string) {
    setReplyType(value === "" ? null : (value as ReplyType));
    setOffset(0);
  }

  function handleStatusChange(value: string) {
    setStatus(value === "" ? null : (value as LeadStatus));
    setOffset(0);
  }

  const hasFilters = Boolean(replyType || status);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Imported SmartLead contacts, replies, and phone enrichment.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="relative w-full sm:w-auto">
            <label htmlFor="lead-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="lead-status"
              className={cn(nativeSelectClass, "w-full sm:w-auto")}
              value={status ?? ""}
              onChange={(event) => handleStatusChange(event.target.value)}
            >
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {LEAD_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <label htmlFor="lead-reply-type" className="sr-only">
              Filter by reply type
            </label>
            <select
              id="lead-reply-type"
              className={cn(nativeSelectClass, "w-full sm:w-auto")}
              value={replyType ?? ""}
              onChange={(event) => handleReplyTypeChange(event.target.value)}
            >
              <option value="">All replies</option>
              <option value="positive">{REPLY_TYPE_LABELS.positive}</option>
              <option value="ooo">{REPLY_TYPE_LABELS.ooo}</option>
            </select>
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {leadsQuery.isPending && !leadsQuery.data ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : items.length === 0 ? (
        <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 p-8">
          <p className="text-sm font-medium text-foreground">
            {hasFilters ? "No matching leads" : "No leads yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "Try another status or reply type, or import more SmartLead conversations."
              : "Imported SmartLead replies will show up here."}
          </p>
        </div>
      ) : (
        <>
          <LeadsList
            leads={items}
            selectedLeadId={selectedLead?.id ?? null}
            onSelectLead={setSelectedLead}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {pageStart}–{pageEnd} of {total}
            </p>
            {total > LEAD_PAGE_SIZE ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canPrev || leadsQuery.isFetching}
                  onClick={() => setOffset((current) => Math.max(0, current - LEAD_PAGE_SIZE))}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canNext || leadsQuery.isFetching}
                  onClick={() => setOffset((current) => current + LEAD_PAGE_SIZE)}
                >
                  Next
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}

      <LeadDetailDrawer
        open={selectedLead !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLead(null);
          }
        }}
        leadId={selectedLead?.id ?? null}
        summary={selectedLead}
      />
    </div>
  );
}
