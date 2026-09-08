import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  heyreachCampaignKeys,
  updateHeyReachSpeedToLead,
  withHeyReachSpeedToLead,
  type HeyReachCampaign,
} from "@/lib/heyreach";
import {
  campaignKeys,
  updateSpeedToLead,
  withCampaignSpeedToLead,
  type Campaign,
} from "@/lib/smartlead";
import { type SpeedToLeadCampaignUpdate } from "@/lib/speed-to-lead";
import { listSdrs, sdrEmailById, sdrKeys } from "@/lib/sdrs";
import { mutationErrorMessage } from "@/lib/tables";
import { Label } from "@/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/ui/select";
import { Switch } from "@/ui/components/ui/switch";

type SpeedToLeadSettingsProps =
  | { source: "smartlead"; campaign: Campaign }
  | { source: "heyreach"; campaign: HeyReachCampaign };

export function SpeedToLeadSettings(props: SpeedToLeadSettingsProps) {
  const queryClient = useQueryClient();

  if (props.source === "smartlead") {
    return (
      <SpeedToLeadSettingsForm
        campaignId={props.campaign.smartlead_campaign_id}
        enabled={props.campaign.speed_to_lead_enabled}
        sdrId={props.campaign.speed_to_lead_sdr_id ?? null}
        description="Auto-assign positive replies to an SDR and start phone enrichment immediately."
        save={async (input) => {
          const updated = await updateSpeedToLead(props.campaign.smartlead_campaign_id, input);
          queryClient.setQueryData<Campaign[]>(campaignKeys.all, (current) =>
            current ? withCampaignSpeedToLead(current, updated) : current,
          );
          await queryClient.invalidateQueries({ queryKey: campaignKeys.all });
        }}
      />
    );
  }

  return (
    <SpeedToLeadSettingsForm
      campaignId={props.campaign.heyreach_campaign_id}
      enabled={props.campaign.speed_to_lead_enabled}
      sdrId={props.campaign.speed_to_lead_sdr_id ?? null}
      description="Auto-assign LinkedIn replies to an SDR and start phone enrichment immediately."
      save={async (input) => {
        const updated = await updateHeyReachSpeedToLead(props.campaign.heyreach_campaign_id, input);
        queryClient.setQueryData<HeyReachCampaign[]>(heyreachCampaignKeys.all, (current) =>
          current ? withHeyReachSpeedToLead(current, updated) : current,
        );
        await queryClient.invalidateQueries({ queryKey: heyreachCampaignKeys.all });
      }}
    />
  );
}

function SpeedToLeadSettingsForm({
  campaignId,
  enabled,
  sdrId: currentSdrId,
  description,
  save,
}: {
  campaignId: number;
  enabled: boolean;
  sdrId: string | null;
  description: string;
  save: (input: SpeedToLeadCampaignUpdate) => Promise<void>;
}) {
  const [sdrId, setSdrId] = useState<string | null>(currentSdrId);

  useEffect(() => {
    setSdrId(currentSdrId);
  }, [campaignId, currentSdrId]);

  const sdrsQuery = useQuery({
    queryKey: sdrKeys.all,
    queryFn: ({ signal }) => listSdrs(signal),
  });

  const mutation = useMutation({
    mutationFn: save,
    onError: () => {
      setSdrId(currentSdrId);
    },
  });

  const sdrs = sdrsQuery.data ?? [];
  const sdrItems = sdrEmailById(sdrs);
  const canEnable = Boolean(sdrId);
  const sdrsError = mutationErrorMessage(
    sdrsQuery.error,
    sdrsQuery.isError ? "Failed to load SDRs" : "",
  );
  const saveError = mutationErrorMessage(
    mutation.error,
    mutation.isError ? "Failed to update speed to lead" : "",
  );

  function handleSdrChange(nextSdrId: string | null) {
    setSdrId(nextSdrId);
    if (enabled && nextSdrId) {
      mutation.mutate({ enabled: true, sdr_id: nextSdrId });
    }
  }

  function handleEnabledChange(nextEnabled: boolean) {
    if (nextEnabled && !sdrId) {
      return;
    }
    mutation.mutate({ enabled: nextEnabled, sdr_id: sdrId });
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-sm font-medium text-foreground">Speed to lead</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch
          id="campaign-speed-to-lead"
          checked={enabled}
          disabled={mutation.isPending || (!enabled && !canEnable)}
          aria-label="Enable speed to lead"
          onCheckedChange={handleEnabledChange}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="campaign-speed-to-lead-sdr">Assigned SDR</Label>
        <Select
          value={sdrId}
          items={sdrItems}
          disabled={mutation.isPending || sdrsQuery.isPending}
          onValueChange={handleSdrChange}
        >
          <SelectTrigger id="campaign-speed-to-lead-sdr" size="lg" className="w-full">
            <SelectValue placeholder={sdrsQuery.isPending ? "Loading SDRs…" : "Choose an SDR"} />
          </SelectTrigger>
          <SelectContent>
            {sdrs.map((sdr) => (
              <SelectItem key={sdr.id} value={sdr.id}>
                {sdr.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!enabled && !canEnable ? (
          <p className="text-xs text-muted-foreground">Choose an SDR before turning this on.</p>
        ) : null}
      </div>

      {sdrsError ? <p className="text-sm text-destructive">{sdrsError}</p> : null}
      {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
    </section>
  );
}
