import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type LeadListItem } from "@/lib/leads";
import { canAssignLeads } from "@/lib/roles";
import { listSdrs, sdrEmailById, sdrKeys } from "@/lib/sdrs";
import {
  listSpeedToLeadEvents,
  SPEED_TO_LEAD_PAGE_SIZE,
  speedToLeadKeys,
  speedToLeadPollInterval,
} from "@/lib/speed-to-lead";
import { mutationErrorMessage } from "@/lib/tables";
import { useAuth } from "@/providers/auth-context";
import { LeadDetailDrawer } from "@/ui/components/leads/lead-detail-drawer";
import { SpeedToLeadList } from "@/ui/components/speed-to-lead/speed-to-lead-list";
import { Button } from "@/ui/components/ui/button";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Label } from "@/ui/components/ui/label";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export function SpeedToLeadPage() {
  const { role } = useAuth();
  const [offset, setOffset] = useState(0);
  const [includeHandled, setIncludeHandled] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadListItem | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const showAssignee = canAssignLeads(role);

  const listParams = useMemo(
    () => ({
      limit: SPEED_TO_LEAD_PAGE_SIZE,
      offset,
      includeHandled,
    }),
    [includeHandled, offset],
  );

  const queueQuery = useQuery({
    queryKey: speedToLeadKeys.list(listParams),
    queryFn: ({ signal }) => listSpeedToLeadEvents({ ...listParams, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => speedToLeadPollInterval(query.state.data?.items ?? []),
  });

  const sdrsQuery = useQuery({
    queryKey: sdrKeys.all,
    queryFn: ({ signal }) => listSdrs(signal),
    enabled: showAssignee,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const items = queueQuery.data?.items ?? [];
  const total = queueQuery.data?.total ?? 0;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = offset + items.length;
  const canPrev = offset > 0;
  const canNext = offset + SPEED_TO_LEAD_PAGE_SIZE < total;
  const error = mutationErrorMessage(
    queueQuery.error,
    queueQuery.isError ? "Failed to load speed-to-lead replies" : "",
  );
  const assigneeEmails = showAssignee ? sdrEmailById(sdrsQuery.data ?? []) : undefined;

  useEffect(() => {
    if (queueQuery.isPlaceholderData) {
      return;
    }
    if (total === 0) {
      if (offset !== 0) {
        setOffset(0);
      }
      return;
    }
    if (offset >= total) {
      setOffset(
        Math.max(0, Math.floor((total - 1) / SPEED_TO_LEAD_PAGE_SIZE) * SPEED_TO_LEAD_PAGE_SIZE),
      );
    }
  }, [offset, queueQuery.isPlaceholderData, total]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
            Speed to lead
          </h1>
          <p className="text-sm text-muted-foreground">
            SmartLead and HeyReach replies assigned for a first touch. Open a row to call, then
            change status to clear it from the queue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="speed-to-lead-include-handled"
            checked={includeHandled}
            onCheckedChange={(checked) => {
              setIncludeHandled(checked === true);
              setOffset(0);
            }}
          />
          <Label htmlFor="speed-to-lead-include-handled">Show handled</Label>
        </div>
      </div>

      {queueQuery.isPending && !queueQuery.data ? (
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
            {includeHandled ? "No speed-to-lead replies yet" : "Queue is clear"}
          </p>
          <p className="text-sm text-muted-foreground">
            {includeHandled
              ? "Enable speed to lead on a SmartLead or HeyReach campaign to capture replies here."
              : "New replies will show up here. Show handled to review earlier work."}
          </p>
        </div>
      ) : (
        <>
          <SpeedToLeadList
            events={items}
            selectedLeadId={selectedLead?.id ?? null}
            onSelectLead={setSelectedLead}
            assigneeEmails={assigneeEmails}
            now={now}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {pageStart}–{pageEnd} of {total}
            </p>
            {total > SPEED_TO_LEAD_PAGE_SIZE ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canPrev || queueQuery.isFetching}
                  onClick={() =>
                    setOffset((current) => Math.max(0, current - SPEED_TO_LEAD_PAGE_SIZE))
                  }
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canNext || queueQuery.isFetching}
                  onClick={() => setOffset((current) => current + SPEED_TO_LEAD_PAGE_SIZE)}
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
