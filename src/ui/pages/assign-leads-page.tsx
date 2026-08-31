import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignLeadsInChunks,
  LEAD_PAGE_SIZE,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  leadKeys,
  listAllLeadIds,
  listLeads,
  REPLY_TYPE_LABELS,
  type LeadAssignmentResponse,
  type LeadListItem,
  type LeadStatus,
  type ReplyType,
} from "@/lib/leads";
import { campaignKeys, listCampaigns } from "@/lib/smartlead";
import { listSdrs, sdrKeys } from "@/lib/sdrs";
import { mutationErrorMessage } from "@/lib/tables";
import { cn } from "@/lib/utils";
import { AssignLeadsDialog } from "@/ui/components/leads/assign-leads-dialog";
import { LeadDetailDrawer } from "@/ui/components/leads/lead-detail-drawer";
import { LeadsList } from "@/ui/components/leads/leads-list";
import { Button } from "@/ui/components/ui/button";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  UnfoldMoreIcon,
  UserCheck01Icon,
} from "@hugeicons/core-free-icons";

const nativeSelectClass =
  "h-9 appearance-none rounded-lg border border-input bg-input/20 px-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30";

export function AssignLeadsPage() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [replyType, setReplyType] = useState<ReplyType | null>(null);
  const [status, setStatus] = useState<LeadStatus | null>(null);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allMatching, setAllMatching] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const listParams = useMemo(
    () => ({
      limit: LEAD_PAGE_SIZE,
      offset,
      replyType,
      status,
      campaignId,
      assignmentStatus: "unassigned" as const,
    }),
    [offset, replyType, status, campaignId],
  );

  const filterParams = useMemo(
    () => ({
      replyType,
      status,
      campaignId,
      assignmentStatus: "unassigned" as const,
    }),
    [replyType, status, campaignId],
  );

  const leadsQuery = useQuery({
    queryKey: leadKeys.list(listParams),
    queryFn: ({ signal }) => listLeads({ ...listParams, signal }),
    placeholderData: keepPreviousData,
  });

  const campaignsQuery = useQuery({
    queryKey: campaignKeys.all,
    queryFn: ({ signal }) => listCampaigns(signal),
  });

  const sdrsQuery = useQuery({
    queryKey: sdrKeys.all,
    queryFn: ({ signal }) => listSdrs(signal),
  });

  const items = leadsQuery.data?.items ?? [];
  const total = leadsQuery.data?.total ?? 0;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = offset + items.length;
  const canPrev = offset > 0;
  const canNext = offset + LEAD_PAGE_SIZE < total;
  const error = mutationErrorMessage(
    leadsQuery.error,
    leadsQuery.isError ? "Failed to load unassigned leads" : "",
  );
  const campaigns = campaignsQuery.data ?? [];
  const campaignOptions = useMemo(() => {
    const imported = campaigns.filter((campaign) => campaign.ever_imported);
    return imported.length > 0 ? imported : campaigns;
  }, [campaigns]);

  const pageFullySelected =
    items.length > 0 &&
    (allMatching || items.every((lead) => selectedIds.includes(lead.id)));
  const selectedCount = allMatching ? total : selectedIds.length;
  const showSelectAllMatching = pageFullySelected && !allMatching && total > selectedIds.length;

  const assignMutation = useMutation({
    mutationFn: async (sdrId: string) => {
      const leadIds = allMatching
        ? await listAllLeadIds(filterParams)
        : selectedIds;
      if (leadIds.length === 0) {
        throw new Error("No leads selected");
      }
      return assignLeadsInChunks({ lead_ids: leadIds, sdr_id: sdrId });
    },
    onSuccess: async (result: LeadAssignmentResponse) => {
      await queryClient.invalidateQueries({ queryKey: leadKeys.all });
      setSelectedIds([]);
      setAllMatching(false);
      setDialogOpen(false);
      const assigned = result.assigned_count;
      const skipped = result.skipped_count;
      const assignedLabel = assigned === 1 ? "lead" : "leads";
      if (skipped > 0) {
        setSuccessMessage(
          `Assigned ${assigned} ${assignedLabel}. ${skipped} already assigned and skipped.`,
        );
      } else {
        setSuccessMessage(`Assigned ${assigned} ${assignedLabel}.`);
      }
    },
  });

  function clearSelection() {
    setSelectedIds([]);
    setAllMatching(false);
  }

  function handleReplyTypeChange(value: string) {
    setReplyType(value === "" ? null : (value as ReplyType));
    setOffset(0);
    clearSelection();
    setSuccessMessage(null);
  }

  function handleStatusChange(value: string) {
    setStatus(value === "" ? null : (value as LeadStatus));
    setOffset(0);
    clearSelection();
    setSuccessMessage(null);
  }

  function handleCampaignChange(value: string) {
    setCampaignId(value === "" ? null : Number(value));
    setOffset(0);
    clearSelection();
    setSuccessMessage(null);
  }

  function handleToggle(leadId: string, selected: boolean) {
    setSuccessMessage(null);
    if (allMatching) {
      setAllMatching(false);
      setSelectedIds(items.map((lead) => lead.id).filter((id) => (selected ? true : id !== leadId)));
      return;
    }
    setSelectedIds((current) => {
      if (selected) {
        return current.includes(leadId) ? current : [...current, leadId];
      }
      return current.filter((id) => id !== leadId);
    });
  }

  function handleTogglePage(selected: boolean) {
    setSuccessMessage(null);
    if (!selected) {
      if (allMatching) {
        clearSelection();
        return;
      }
      const pageIds = new Set(items.map((lead) => lead.id));
      setSelectedIds((current) => current.filter((id) => !pageIds.has(id)));
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const lead of items) {
        next.add(lead.id);
      }
      return [...next];
    });
  }

  const hasFilters = Boolean(replyType || status || campaignId);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">Assign leads</h1>
          <p className="text-sm text-muted-foreground">
            Unassigned SmartLead contacts. Select leads and assign them to an SDR.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-auto">
            <label htmlFor="assign-lead-campaign" className="sr-only">
              Filter by campaign
            </label>
            <select
              id="assign-lead-campaign"
              className={cn(nativeSelectClass, "w-full sm:max-w-56")}
              value={campaignId ?? ""}
              onChange={(event) => handleCampaignChange(event.target.value)}
            >
              <option value="">All campaigns</option>
              {campaignOptions.map((campaign) => (
                <option key={campaign.smartlead_campaign_id} value={campaign.smartlead_campaign_id}>
                  {campaign.name}
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
            <label htmlFor="assign-lead-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="assign-lead-status"
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
            <label htmlFor="assign-lead-reply-type" className="sr-only">
              Filter by reply type
            </label>
            <select
              id="assign-lead-reply-type"
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
          <Button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => setDialogOpen(true)}
          >
            <HugeiconsIcon icon={UserCheck01Icon} strokeWidth={2} />
            {selectedCount > 0
              ? `Assign ${selectedCount} lead${selectedCount === 1 ? "" : "s"}`
              : "Assign leads"}
          </Button>
        </div>
      </div>

      {campaignsQuery.isError ? (
        <p className="text-sm text-destructive">
          {mutationErrorMessage(campaignsQuery.error, "Failed to load campaigns")}
        </p>
      ) : null}

      {successMessage ? <p className="text-sm text-foreground">{successMessage}</p> : null}

      {showSelectAllMatching || allMatching ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
          {allMatching ? (
            <>
              <p className="text-foreground">
                All {total} matching lead{total === 1 ? "" : "s"} selected.
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Clear selection
              </Button>
            </>
          ) : (
            <>
              <p className="text-foreground">
                All {items.length} leads on this page are selected.
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAllMatching(true)}>
                Select all {total} matching leads
              </Button>
            </>
          )}
        </div>
      ) : null}

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
            {hasFilters ? "No matching unassigned leads" : "No unassigned leads"}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "Try another campaign, status, or reply type."
              : "Imported leads that still need an SDR will show up here."}
          </p>
        </div>
      ) : (
        <>
          <LeadsList
            leads={items}
            selectedLeadId={selectedLead?.id ?? null}
            onSelectLead={setSelectedLead}
            showCampaigns
            selection={{
              selectedIds,
              allMatching,
              onToggle: handleToggle,
              onTogglePage: handleTogglePage,
            }}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {pageStart}–{pageEnd} of {total}
              {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
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

      <AssignLeadsDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && assignMutation.isPending) {
            return;
          }
          setDialogOpen(open);
          if (!open) {
            assignMutation.reset();
          }
        }}
        selectedCount={selectedCount}
        sdrs={sdrsQuery.data ?? []}
        sdrsLoading={sdrsQuery.isPending}
        sdrsError={mutationErrorMessage(
          sdrsQuery.error,
          sdrsQuery.isError ? "Failed to load SDRs" : "",
        )}
        error={mutationErrorMessage(
          assignMutation.error,
          assignMutation.isError ? "Failed to assign leads" : "",
        )}
        isPending={assignMutation.isPending}
        onAssign={(sdrId) => assignMutation.mutate(sdrId)}
      />
    </div>
  );
}
