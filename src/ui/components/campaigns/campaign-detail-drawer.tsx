import { type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatPropertyValue, REPLY_TYPE_LABELS, type ReplyType } from "@/lib/leads";
import {
  createPhoneEnrichment,
  getLatestPhoneEnrichmentForImport,
  phoneEnrichmentIsActive,
  phoneEnrichmentKeys,
  phoneEnrichmentSnapshotFromRun,
  type PhoneEnrichmentSnapshot,
} from "@/lib/phone-enrichments";
import {
  campaignImportIsActive,
  campaignKeys,
  campaignLastImport,
  getImport,
  importKeys,
  importRunCanEnrich,
  importRunIsActive,
  withCampaignLastEnrichment,
  type Campaign,
  type CampaignLastImport,
  type ImportRun,
} from "@/lib/smartlead";
import { formatTableDate, mutationErrorMessage } from "@/lib/tables";
import { CampaignStatusBadge } from "@/ui/components/campaigns/campaign-status-badge";
import { SpeedToLeadSettings } from "@/ui/components/campaigns/speed-to-lead-settings";
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
  DrawerHeader,
  DrawerTitle,
} from "@/ui/components/ui/drawer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Call02Icon,
  Cancel01Icon,
  Download01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";

type CampaignDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
  isImportPending: (campaignId: number, replyType: ReplyType) => boolean;
  importErrorFor: (campaignId: number, replyType: ReplyType) => string;
  onImport: (campaign: Campaign, replyType: ReplyType) => void;
};

export function CampaignDetailDrawer({
  open,
  onOpenChange,
  campaign,
  isImportPending,
  importErrorFor,
  onImport,
}: CampaignDetailDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="sm:[--drawer-content-width:36rem]">
        <DrawerHeader className="relative pr-12">
          <DrawerTitle>{campaign?.name ?? "Campaign"}</DrawerTitle>
          <DrawerDescription>
            {campaign
              ? `Import and enrich Positive and OOO replies separately.`
              : "Campaign imports"}
          </DrawerDescription>
          <DrawerClose
            render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          {campaign ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2">
                {campaign.status ? <CampaignStatusBadge status={campaign.status} /> : null}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {campaign.smartlead_campaign_id}
                </span>
              </div>

              <SpeedToLeadSettings source="smartlead" campaign={campaign} />

              {(["positive", "ooo"] as const).map((replyType) => (
                <ReplyImportPanel
                  key={replyType}
                  open={open}
                  campaign={campaign}
                  replyType={replyType}
                  leadCount={
                    replyType === "positive"
                      ? campaign.positive_lead_count
                      : campaign.ooo_lead_count
                  }
                  lastImport={campaignLastImport(campaign, replyType)}
                  importPending={isImportPending(campaign.smartlead_campaign_id, replyType)}
                  importError={importErrorFor(campaign.smartlead_campaign_id, replyType)}
                  onImport={onImport}
                />
              ))}
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ReplyImportPanel({
  open,
  campaign,
  replyType,
  leadCount,
  lastImport,
  importPending,
  importError,
  onImport,
}: {
  open: boolean;
  campaign: Campaign;
  replyType: ReplyType;
  leadCount: number;
  lastImport: CampaignLastImport | null;
  importPending: boolean;
  importError: string;
  onImport: (campaign: Campaign, replyType: ReplyType) => void;
}) {
  const queryClient = useQueryClient();
  const runId = lastImport?.id ?? null;
  const importBusy = importPending || campaignImportIsActive(campaign, replyType);

  const detailQuery = useQuery({
    queryKey: importKeys.detail(runId ?? ""),
    queryFn: ({ signal }) => getImport(runId ?? "", signal),
    enabled: open && Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? lastImport?.status;
      return status && importRunIsActive(status) ? 2000 : false;
    },
  });

  const run: ImportRun | CampaignLastImport | null = detailQuery.data ?? lastImport;
  const runActive = Boolean(run && importRunIsActive(run.status));
  const lastEnrichment = detailQuery.data?.last_enrichment ?? lastImport?.last_enrichment ?? null;

  const enrichmentQuery = useQuery({
    queryKey: phoneEnrichmentKeys.byImport(runId ?? ""),
    queryFn: ({ signal }) => getLatestPhoneEnrichmentForImport(runId ?? "", signal),
    enabled: open && Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? lastEnrichment?.status;
      return status && phoneEnrichmentIsActive(status) ? 2000 : false;
    },
  });

  const enrich = useMutation({
    mutationFn: () => createPhoneEnrichment({ source_import_run_id: runId ?? "" }),
    onSuccess: async (enrichmentRun) => {
      if (!runId) {
        return;
      }
      queryClient.setQueryData(phoneEnrichmentKeys.byImport(runId), enrichmentRun);
      queryClient.setQueryData(phoneEnrichmentKeys.detail(enrichmentRun.id), enrichmentRun);
      queryClient.setQueryData<Campaign[]>(campaignKeys.all, (current) =>
        current
          ? withCampaignLastEnrichment(
              current,
              campaign.smartlead_campaign_id,
              replyType,
              phoneEnrichmentSnapshotFromRun(enrichmentRun),
            )
          : current,
      );
      await queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });

  const enrichment: PhoneEnrichmentSnapshot | null = enrichmentQuery.data ?? lastEnrichment ?? null;
  const enrichmentActive = enrichment ? phoneEnrichmentIsActive(enrichment.status) : false;
  const canEnrich = Boolean(
    run && importRunCanEnrich(run) && !enrichmentActive && !enrich.isPending,
  );
  const processedCount = enrichment
    ? enrichment.leads_enriched +
      enrichment.leads_not_found +
      enrichment.leads_skipped +
      enrichment.leads_failed
    : 0;
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

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-sm font-medium text-foreground">
            {REPLY_TYPE_LABELS[replyType]} replies
          </h3>
          <p className="text-xs text-muted-foreground">
            {leadCount} imported lead{leadCount === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={importBusy}
          onClick={() => onImport(campaign, replyType)}
        >
          {importBusy ? (
            <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" />
          ) : (
            <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
          )}
          {importBusy ? "Importing…" : run ? "Re-import" : "Import"}
        </Button>
      </div>

      {importError ? <p className="text-sm text-destructive">{importError}</p> : null}
      {detailError && !run ? <p className="text-sm text-destructive">{detailError}</p> : null}

      {run ? (
        <div className="flex flex-col gap-4">
          <Section label="Import status">
            <div className="flex items-center gap-2">
              <ImportStatusBadge status={run.status} />
              {runActive ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin text-muted-foreground"
                />
              ) : null}
            </div>
          </Section>

          <Section label="Progress">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Stat label="Leads" value={run.leads_processed} />
              <Stat label="Conversations" value={run.conversations_processed} />
              {detailQuery.data ? (
                <Stat label="Replies" value={detailQuery.data.replies_processed} />
              ) : null}
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
                {enrichment.leads_selected > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {processedCount} of {enrichment.leads_selected} processed
                  </p>
                ) : null}
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
                Enrich phones for {REPLY_TYPE_LABELS[replyType].toLowerCase()} leads from this
                import.
              </p>
            )}
            {enrichmentError ? <p className="text-sm text-destructive">{enrichmentError}</p> : null}
            {enrichError ? <p className="text-sm text-destructive">{enrichError}</p> : null}
            {run && importRunCanEnrich(run) ? (
              <Button type="button" disabled={!canEnrich} onClick={() => enrich.mutate()}>
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
            ) : null}
          </Section>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Import {REPLY_TYPE_LABELS[replyType].toLowerCase()} replies for this campaign to capture
          leads and enrich phones.
        </p>
      )}
    </section>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</h4>
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
