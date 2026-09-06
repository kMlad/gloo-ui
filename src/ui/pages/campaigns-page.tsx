import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReplyType } from "@/lib/leads";
import {
  anyImportRunIsActive,
  CAMPAIGN_IMPORT_LOOKBACK,
  campaignKeys,
  createImport,
  importKeys,
  latestDedicatedImport,
  listCampaigns,
  listImports,
  mergeImportRuns,
  type Campaign,
  type ImportRunListResponse,
} from "@/lib/smartlead";
import { mutationErrorMessage } from "@/lib/tables";
import { CampaignDetailDrawer } from "@/ui/components/campaigns/campaign-detail-drawer";
import { CampaignsList } from "@/ui/components/campaigns/campaigns-list";
import { Skeleton } from "@/ui/components/ui/skeleton";

export function CampaignsPage() {
  const queryClient = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const importListParams = useMemo(() => ({ limit: CAMPAIGN_IMPORT_LOOKBACK, offset: 0 }), []);
  const hadActiveImport = useRef(false);

  const importsQuery = useQuery({
    queryKey: importKeys.list(importListParams),
    queryFn: ({ signal }) => listImports({ ...importListParams, signal }),
    refetchInterval: (query) =>
      anyImportRunIsActive(query.state.data?.items ?? []) ? 2000 : false,
  });

  const importRuns = useMemo(
    () => mergeImportRuns(importsQuery.data?.items ?? []),
    [importsQuery.data?.items],
  );
  const importsActive = anyImportRunIsActive(importRuns);

  const campaignsQuery = useQuery({
    queryKey: campaignKeys.all,
    queryFn: ({ signal }) => listCampaigns(signal),
    refetchInterval: importsActive ? 2000 : false,
  });

  const campaigns = campaignsQuery.data ?? [];
  const selectedCampaign =
    campaigns.find((campaign) => campaign.smartlead_campaign_id === selectedCampaignId) ?? null;
  const importLocked = importsActive;
  const loadError = mutationErrorMessage(
    campaignsQuery.error,
    campaignsQuery.isError ? "Failed to load campaigns" : "",
  );

  const importMutation = useMutation({
    mutationFn: ({ campaignId, replyType }: { campaignId: number; replyType: ReplyType }) =>
      createImport({
        campaign_ids: [campaignId],
        reply_types: [replyType],
      }),
    onSuccess: async (run) => {
      queryClient.setQueryData(importKeys.detail(run.id), run);
      queryClient.setQueryData<ImportRunListResponse>(
        importKeys.list(importListParams),
        (current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            items: mergeImportRuns([run], current.items),
          };
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
        queryClient.invalidateQueries({ queryKey: importKeys.all }),
      ]);
    },
  });

  const importError = mutationErrorMessage(
    importMutation.error,
    importMutation.isError ? "Failed to queue import" : "",
  );
  const importing = importMutation.isPending ? (importMutation.variables ?? null) : null;

  useEffect(() => {
    if (importsActive) {
      hadActiveImport.current = true;
      return;
    }
    if (!hadActiveImport.current) {
      return;
    }
    hadActiveImport.current = false;
    void queryClient.invalidateQueries({ queryKey: campaignKeys.all });
  }, [importsActive, queryClient]);

  const latestRunFor = useCallback(
    (campaignId: number, replyType: ReplyType) =>
      latestDedicatedImport(importRuns, campaignId, replyType),
    [importRuns],
  );

  const handleImport = useCallback(
    (campaign: Campaign, replyType: ReplyType) => {
      setSelectedCampaignId(campaign.smartlead_campaign_id);
      importMutation.mutate({
        campaignId: campaign.smartlead_campaign_id,
        replyType,
      });
    },
    [importMutation],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Import Positive or OOO replies per campaign, then open a campaign to enrich those leads.
        </p>
      </div>

      {importLocked ? (
        <p className="text-sm text-muted-foreground">One import can run at a time.</p>
      ) : null}

      {importError && selectedCampaignId === null ? (
        <p className="text-sm text-destructive">{importError}</p>
      ) : null}

      {campaignsQuery.isPending ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : campaigns.length === 0 ? (
        <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/30 p-8">
          <p className="text-sm font-medium text-foreground">No campaigns yet</p>
          <p className="text-sm text-muted-foreground">
            Campaigns from SmartLead will show up here once they can be discovered.
          </p>
        </div>
      ) : (
        <CampaignsList
          campaigns={campaigns}
          selectedCampaignId={selectedCampaignId}
          latestRunFor={latestRunFor}
          importing={importing}
          importLocked={importLocked || importMutation.isPending}
          onSelectCampaign={(campaign) => setSelectedCampaignId(campaign.smartlead_campaign_id)}
          onImport={handleImport}
        />
      )}

      <CampaignDetailDrawer
        open={selectedCampaignId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCampaignId(null);
          }
        }}
        campaign={selectedCampaign}
        runs={importRuns}
        importing={importing}
        importLocked={importLocked || importMutation.isPending}
        importError={importError}
        onImport={handleImport}
      />
    </div>
  );
}
