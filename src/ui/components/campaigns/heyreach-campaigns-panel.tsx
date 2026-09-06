import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import {
  anyHeyReachCampaignHasActiveWork,
  createHeyReachImport,
  heyreachCampaignKeys,
  heyreachImportKeys,
  heyreachLastImportFromRun,
  listHeyReachCampaigns,
  withHeyReachLastImport,
  type HeyReachCampaign,
} from "@/lib/heyreach";
import { mutationErrorMessage } from "@/lib/tables";
import { HeyReachCampaignDetailDrawer } from "@/ui/components/campaigns/heyreach-campaign-detail-drawer";
import { HeyReachCampaignsList } from "@/ui/components/campaigns/heyreach-campaigns-list";
import { Skeleton } from "@/ui/components/ui/skeleton";

export function HeyReachCampaignsPanel() {
  const queryClient = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [pendingCampaignIds, setPendingCampaignIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [importErrors, setImportErrors] = useState<Record<number, string>>({});

  const campaignsQuery = useQuery({
    queryKey: heyreachCampaignKeys.all,
    queryFn: ({ signal }) => listHeyReachCampaigns(signal),
    refetchInterval: (query) =>
      anyHeyReachCampaignHasActiveWork(query.state.data ?? []) ? 2000 : false,
  });

  const campaigns = campaignsQuery.data ?? [];
  const selectedCampaign =
    campaigns.find((campaign) => campaign.heyreach_campaign_id === selectedCampaignId) ?? null;
  const loadError = mutationErrorMessage(
    campaignsQuery.error,
    campaignsQuery.isError ? "Failed to load campaigns" : "",
  );

  const importMutation = useMutation({
    mutationFn: (campaignId: number) =>
      createHeyReachImport({
        campaign_ids: [campaignId],
      }),
    onMutate: (campaignId) => {
      setPendingCampaignIds((current) => new Set(current).add(campaignId));
      setImportErrors((current) => {
        if (!(campaignId in current)) {
          return current;
        }
        const next = { ...current };
        delete next[campaignId];
        return next;
      });
    },
    onSuccess: async (run, campaignId) => {
      queryClient.setQueryData(heyreachImportKeys.detail(run.id), run);
      queryClient.setQueryData<HeyReachCampaign[]>(heyreachCampaignKeys.all, (current) =>
        current
          ? withHeyReachLastImport(current, campaignId, heyreachLastImportFromRun(run))
          : current,
      );
      await queryClient.invalidateQueries({ queryKey: heyreachCampaignKeys.all });
    },
    onError: async (error, campaignId) => {
      setImportErrors((current) => ({
        ...current,
        [campaignId]: mutationErrorMessage(error, "Failed to queue import"),
      }));
      if (error instanceof ApiError && error.status === 409) {
        await queryClient.invalidateQueries({ queryKey: heyreachCampaignKeys.all });
      }
    },
    onSettled: (_data, _error, campaignId) => {
      setPendingCampaignIds((current) => {
        if (!current.has(campaignId)) {
          return current;
        }
        const next = new Set(current);
        next.delete(campaignId);
        return next;
      });
    },
  });

  const isImportPending = useCallback(
    (campaignId: number) => pendingCampaignIds.has(campaignId),
    [pendingCampaignIds],
  );

  const handleImport = useCallback(
    (campaign: HeyReachCampaign) => {
      setSelectedCampaignId(campaign.heyreach_campaign_id);
      importMutation.mutate(campaign.heyreach_campaign_id);
    },
    [importMutation],
  );

  return (
    <>
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
            Campaigns from HeyReach will show up here once they can be discovered.
          </p>
        </div>
      ) : (
        <HeyReachCampaignsList
          campaigns={campaigns}
          selectedCampaignId={selectedCampaignId}
          isImportPending={isImportPending}
          onSelectCampaign={(campaign) => setSelectedCampaignId(campaign.heyreach_campaign_id)}
          onImport={handleImport}
        />
      )}

      <HeyReachCampaignDetailDrawer
        open={selectedCampaignId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCampaignId(null);
          }
        }}
        campaign={selectedCampaign}
        importPending={selectedCampaignId !== null ? isImportPending(selectedCampaignId) : false}
        importError={selectedCampaignId !== null ? (importErrors[selectedCampaignId] ?? "") : ""}
        onImport={handleImport}
      />
    </>
  );
}
