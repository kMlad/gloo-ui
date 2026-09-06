import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { type ReplyType } from "@/lib/leads";
import {
  anyCampaignHasActiveWork,
  campaignKeys,
  campaignLastImportFromRun,
  createImport,
  importKeys,
  importScopeKey,
  listCampaigns,
  withCampaignLastImport,
  type Campaign,
} from "@/lib/smartlead";
import { mutationErrorMessage } from "@/lib/tables";
import { CampaignDetailDrawer } from "@/ui/components/campaigns/campaign-detail-drawer";
import { CampaignsList } from "@/ui/components/campaigns/campaigns-list";
import { Skeleton } from "@/ui/components/ui/skeleton";

export function CampaignsPage() {
  const queryClient = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [pendingScopes, setPendingScopes] = useState<ReadonlySet<string>>(() => new Set());
  const [importErrors, setImportErrors] = useState<Record<string, string>>({});

  const campaignsQuery = useQuery({
    queryKey: campaignKeys.all,
    queryFn: ({ signal }) => listCampaigns(signal),
    refetchInterval: (query) => (anyCampaignHasActiveWork(query.state.data ?? []) ? 2000 : false),
  });

  const campaigns = campaignsQuery.data ?? [];
  const selectedCampaign =
    campaigns.find((campaign) => campaign.smartlead_campaign_id === selectedCampaignId) ?? null;
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
    onMutate: ({ campaignId, replyType }) => {
      const key = importScopeKey(campaignId, replyType);
      setPendingScopes((current) => new Set(current).add(key));
      setImportErrors((current) => {
        if (!(key in current)) {
          return current;
        }
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    onSuccess: async (run, { campaignId, replyType }) => {
      queryClient.setQueryData(importKeys.detail(run.id), run);
      queryClient.setQueryData<Campaign[]>(campaignKeys.all, (current) =>
        current
          ? withCampaignLastImport(current, campaignId, replyType, campaignLastImportFromRun(run))
          : current,
      );
      await queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
    onError: async (error, { campaignId, replyType }) => {
      const key = importScopeKey(campaignId, replyType);
      setImportErrors((current) => ({
        ...current,
        [key]: mutationErrorMessage(error, "Failed to queue import"),
      }));
      if (error instanceof ApiError && error.status === 409) {
        await queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      }
    },
    onSettled: (_data, _error, { campaignId, replyType }) => {
      const key = importScopeKey(campaignId, replyType);
      setPendingScopes((current) => {
        if (!current.has(key)) {
          return current;
        }
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    },
  });

  const isImportPending = useCallback(
    (campaignId: number, replyType: ReplyType) =>
      pendingScopes.has(importScopeKey(campaignId, replyType)),
    [pendingScopes],
  );

  const importErrorFor = useCallback(
    (campaignId: number, replyType: ReplyType) =>
      importErrors[importScopeKey(campaignId, replyType)] ?? "",
    [importErrors],
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
          Import Positive and OOO replies independently per campaign, then open a campaign to enrich
          those leads.
        </p>
      </div>

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
          isImportPending={isImportPending}
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
        isImportPending={isImportPending}
        importErrorFor={importErrorFor}
        onImport={handleImport}
      />
    </div>
  );
}
