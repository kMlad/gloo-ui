import { type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatPropertyValue,
  leadDisplayName,
  leadPhone,
  REPLY_TYPE_LABELS,
} from "@/lib/leads";
import {
  createPhoneEnrichment,
  getPhoneEnrichment,
  phoneEnrichmentIsActive,
  phoneEnrichmentKeys,
  type PhoneEnrichmentRun,
} from "@/lib/phone-enrichments";
import {
  getImport,
  importKeys,
  importRunCanEnrich,
  importRunIsActive,
  listImportLeads,
  type ImportRun,
} from "@/lib/smartlead";
import { formatTableDate, mutationErrorMessage } from "@/lib/tables";
import {
  ImportStatusBadge,
  PhoneEnrichmentStatusBadge,
} from "@/ui/components/imports/run-status-badge";
import { Button } from "@/ui/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/ui/components/ui/drawer";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Call02Icon, Cancel01Icon, Loading03Icon } from "@hugeicons/core-free-icons";

type ImportRunDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string | null;
  summary?: ImportRun | null;
};

export function ImportRunDrawer({ open, onOpenChange, runId, summary }: ImportRunDrawerProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: importKeys.detail(runId ?? ""),
    queryFn: ({ signal }) => getImport(runId ?? "", signal),
    enabled: open && Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && importRunIsActive(status) ? 2000 : false;
    },
  });

  const run = detailQuery.data ?? (summary?.id === runId ? summary : null);

  const leadsQuery = useQuery({
    queryKey: importKeys.leads(runId ?? ""),
    queryFn: ({ signal }) => listImportLeads(runId ?? "", { limit: 50, offset: 0, signal }),
    enabled: open && Boolean(runId) && Boolean(run && run.leads_processed > 0),
  });

  const enrichmentSeedQuery = useQuery<PhoneEnrichmentRun>({
    queryKey: phoneEnrichmentKeys.byImport(runId ?? ""),
    queryFn: () => Promise.reject(new Error("Phone enrichment seed is cache-only")),
    enabled: false,
    staleTime: Infinity,
  });

  const enrichmentRunId = enrichmentSeedQuery.data?.id ?? null;

  const enrichmentQuery = useQuery({
    queryKey: phoneEnrichmentKeys.detail(enrichmentRunId ?? ""),
    queryFn: ({ signal }) => getPhoneEnrichment(enrichmentRunId ?? "", signal),
    enabled: open && Boolean(enrichmentRunId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && phoneEnrichmentIsActive(status) ? 2000 : false;
    },
  });

  const enrich = useMutation({
    mutationFn: () => createPhoneEnrichment({ source_import_run_id: runId ?? "" }),
    onSuccess: (enrichmentRun) => {
      if (!runId) {
        return;
      }
      queryClient.setQueryData(phoneEnrichmentKeys.byImport(runId), enrichmentRun);
      queryClient.setQueryData(phoneEnrichmentKeys.detail(enrichmentRun.id), enrichmentRun);
    },
  });

  const enrichment = enrichmentQuery.data ?? enrichmentSeedQuery.data ?? null;
  const enrichmentActive = enrichment ? phoneEnrichmentIsActive(enrichment.status) : false;
  const canEnrich = Boolean(run && importRunCanEnrich(run) && !enrichmentActive && !enrich.isPending);
  const detailError = mutationErrorMessage(
    detailQuery.error,
    detailQuery.isError ? "Failed to load import" : "",
  );
  const enrichError = mutationErrorMessage(
    enrich.error,
    enrich.isError ? "Failed to start phone enrichment" : "",
  );
  const enrichmentError = mutationErrorMessage(
    enrichmentQuery.error,
    enrichmentQuery.isError ? "Failed to load enrichment status" : "",
  );
  const leads = leadsQuery.data?.items ?? [];
  const leadsTotal = leadsQuery.data?.total ?? 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="sm:[--drawer-content-width:32rem]">
        <DrawerHeader className="relative pr-12">
          <DrawerTitle>Import run</DrawerTitle>
          <DrawerDescription>
            {run ? `${run.campaign_ids.length} campaign${run.campaign_ids.length === 1 ? "" : "s"}` : "Import status"}
          </DrawerDescription>
          <DrawerClose
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          {detailQuery.isPending && !run ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : detailError && !run ? (
            <p className="text-sm text-destructive">{detailError}</p>
          ) : run ? (
            <div className="flex flex-col gap-5">
              <Section label="Status">
                <div className="flex items-center gap-2">
                  <ImportStatusBadge status={run.status} />
                  {importRunIsActive(run.status) ? (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      strokeWidth={2}
                      className="size-4 animate-spin text-muted-foreground"
                    />
                  ) : null}
                </div>
              </Section>

              <Section label="Campaigns">
                <p className="text-sm tabular-nums text-foreground">
                  {run.campaign_ids.length > 0 ? run.campaign_ids.join(", ") : "—"}
                </p>
              </Section>

              <Section label="Reply types">
                <p className="text-sm text-foreground">
                  {run.reply_types.map((type) => REPLY_TYPE_LABELS[type]).join(", ")}
                </p>
              </Section>

              <Section label="Progress">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Stat label="Leads" value={run.leads_processed} />
                  <Stat label="Conversations" value={run.conversations_processed} />
                  <Stat label="Replies" value={run.replies_processed} />
                  <Stat label="Qualifying" value={run.qualifying_conversation_count} />
                </dl>
              </Section>

              <Section label="Timing">
                <dl className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Started</dt>
                    <dd className="text-foreground">{formatTableDate(run.started_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Completed</dt>
                    <dd className="text-foreground">
                      {run.completed_at ? formatTableDate(run.completed_at) : "—"}
                    </dd>
                  </div>
                </dl>
              </Section>

              {run.errors.length > 0 ? (
                <Section label="Errors">
                  <ul className="flex flex-col gap-1 text-sm text-destructive">
                    {run.errors.map((error, index) => (
                      <li key={index}>{formatPropertyValue(error)}</li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {run.leads_processed > 0 ? (
                <Section label="Leads in this run">
                  {leadsQuery.isPending ? (
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : leads.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No lead preview available.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {leads.map((lead) => (
                        <li key={lead.id} className="min-w-0 text-sm">
                          <p className="truncate font-medium text-foreground">{leadDisplayName(lead)}</p>
                          <p className="truncate text-muted-foreground">
                            {lead.email}
                            {leadPhone(lead) ? ` · ${leadPhone(lead)}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {leadsTotal > leads.length ? (
                    <p className="text-xs text-muted-foreground">
                      Showing {leads.length} of {leadsTotal}
                    </p>
                  ) : null}
                </Section>
              ) : null}

              <Section label="Phone enrichment">
                {enrichment ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <PhoneEnrichmentStatusBadge status={enrichment.status} />
                      {enrichmentActive ? (
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          strokeWidth={2}
                          className="size-4 animate-spin text-muted-foreground"
                        />
                      ) : null}
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <Stat label="Selected" value={enrichment.leads_selected} />
                      <Stat label="Enriched" value={enrichment.leads_enriched} />
                      <Stat label="Not found" value={enrichment.leads_not_found} />
                      <Stat label="Skipped" value={enrichment.leads_skipped} />
                      <Stat label="Failed" value={enrichment.leads_failed} />
                    </dl>
                    {enrichment.errors.length > 0 ? (
                      <ul className="flex flex-col gap-1 text-sm text-destructive">
                        {enrichment.errors.map((error, index) => (
                          <li key={index}>{formatPropertyValue(error)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Enrich phones for every lead captured by this import.
                  </p>
                )}
                {enrichmentError ? <p className="text-sm text-destructive">{enrichmentError}</p> : null}
                {enrichError ? <p className="text-sm text-destructive">{enrichError}</p> : null}
              </Section>
            </div>
          ) : null}
        </div>

        {run && importRunCanEnrich(run) ? (
          <DrawerFooter>
            <Button
              type="button"
              disabled={!canEnrich}
              onClick={() => enrich.mutate()}
            >
              {enrich.isPending || enrichmentActive ? (
                <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" />
              ) : (
                <HugeiconsIcon icon={Call02Icon} strokeWidth={2} />
              )}
              {enrich.isPending
                ? "Starting…"
                : enrichmentActive
                  ? "Enriching…"
                  : enrichment
                    ? "Run enrichment again"
                    : "Enrich phones"}
            </Button>
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
