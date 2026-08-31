import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { REPLY_TYPE_LABELS, REPLY_TYPES, type ReplyType } from "@/lib/leads";
import { campaignKeys, createImport, importKeys, listCampaigns } from "@/lib/smartlead";
import { mutationErrorMessage } from "@/lib/tables";
import { CampaignsList } from "@/ui/components/campaigns/campaigns-list";
import { Button } from "@/ui/components/ui/button";
import { Checkbox } from "@/ui/components/ui/checkbox";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";

export function CampaignsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [replyTypes, setReplyTypes] = useState<ReplyType[]>(["positive"]);

  const campaignsQuery = useQuery({
    queryKey: campaignKeys.all,
    queryFn: ({ signal }) => listCampaigns(signal),
  });

  const campaigns = campaignsQuery.data ?? [];
  const loadError = mutationErrorMessage(
    campaignsQuery.error,
    campaignsQuery.isError ? "Failed to load campaigns" : "",
  );

  const importMutation = useMutation({
    mutationFn: createImport,
    onSuccess: async (run) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: campaignKeys.all }),
        queryClient.invalidateQueries({ queryKey: importKeys.all }),
      ]);
      setSelectedIds([]);
      void navigate("/imports", { state: { selectedRunId: run.id } });
    },
  });

  const importError = mutationErrorMessage(
    importMutation.error,
    importMutation.isError ? "Failed to queue import" : "",
  );

  function handleToggle(campaignId: number, selected: boolean) {
    setSelectedIds((current) => {
      if (selected) {
        return current.includes(campaignId) ? current : [...current, campaignId];
      }
      return current.filter((id) => id !== campaignId);
    });
  }

  function handleToggleAll(selected: boolean) {
    setSelectedIds(selected ? campaigns.map((campaign) => campaign.smartlead_campaign_id) : []);
  }

  function handleReplyTypeChange(type: ReplyType, selected: boolean) {
    setReplyTypes((current) => {
      if (selected) {
        return current.includes(type) ? current : [...current, type];
      }
      return current.filter((value) => value !== type);
    });
  }

  const canImport = selectedIds.length > 0 && replyTypes.length > 0 && !importMutation.isPending;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            SmartLead campaigns and which ones already have imported leads.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <fieldset className="m-0 flex flex-wrap items-center gap-3 border-0 p-0">
            <legend className="sr-only">Reply types to import</legend>
            {REPLY_TYPES.map((type) => (
              <label key={type} className="inline-flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={replyTypes.includes(type)}
                  onCheckedChange={(checked) => handleReplyTypeChange(type, checked === true)}
                />
                {REPLY_TYPE_LABELS[type]}
              </label>
            ))}
          </fieldset>
          <Button
            type="button"
            disabled={!canImport}
            onClick={() =>
              importMutation.mutate({
                campaign_ids: selectedIds,
                reply_types: replyTypes,
              })
            }
          >
            <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
            {importMutation.isPending
              ? "Queueing…"
              : selectedIds.length > 0
                ? `Import ${selectedIds.length} campaign${selectedIds.length === 1 ? "" : "s"}`
                : "Import campaigns"}
          </Button>
        </div>
      </div>

      {importError ? <p className="text-sm text-destructive">{importError}</p> : null}

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
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
        />
      )}
    </div>
  );
}
