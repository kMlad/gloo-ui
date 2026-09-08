import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { replyTypeSchema, type LeadListResponse } from "@/lib/leads";
import { type SpeedToLeadCampaignUpdate } from "@/lib/speed-to-lead";
import {
  phoneEnrichmentIsActive,
  phoneEnrichmentSnapshotSchema,
  type PhoneEnrichmentSnapshot,
} from "@/lib/phone-enrichments";
import {
  campaignLastImportSchema,
  importRunCanEnrich,
  importRunIsActive,
  importStatusSchema,
  newIdempotencyKey,
  type CampaignLastImport,
  type ImportStatus,
} from "@/lib/smartlead";

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const heyreachCampaignSchema = z.object({
  heyreach_campaign_id: z.number().int(),
  name: z.string(),
  enabled: z.boolean(),
  status: z.string().nullable().optional(),
  ever_imported: z.boolean().default(false),
  imported_lead_count: z.number().int().default(0),
  last_imported_at: z.string().nullable().optional(),
  last_import_run_id: z.string().uuid().nullable().optional(),
  last_import: campaignLastImportSchema.nullable().optional(),
  speed_to_lead_enabled: z.boolean().optional().default(false),
  speed_to_lead_sdr_id: z.string().uuid().nullable().optional().default(null),
  created_at: z.string(),
  updated_at: z.string(),
});
export type HeyReachCampaign = z.infer<typeof heyreachCampaignSchema>;

export const heyreachImportRunSchema = z.object({
  id: z.string().uuid(),
  status: importStatusSchema,
  campaign_ids: z.array(z.number().int()),
  reply_types: z.array(replyTypeSchema).default([]),
  reply_time_from: z.string().nullable(),
  reply_time_to: z.string().nullable(),
  requested_by: z.string().uuid().nullable().optional(),
  idempotency_key: z.string().nullable().optional(),
  max_conversations: z.number().int(),
  qualifying_conversation_count: z.number().int(),
  leads_processed: z.number().int(),
  conversations_processed: z.number().int(),
  replies_processed: z.number().int(),
  errors: z.array(jsonRecordSchema),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  last_enrichment: phoneEnrichmentSnapshotSchema.nullable().optional(),
});
export type HeyReachImportRun = z.infer<typeof heyreachImportRunSchema>;

export type CreateHeyReachImportInput = {
  campaign_ids: number[];
};

export const heyreachCampaignKeys = {
  all: ["heyreach", "campaigns"] as const,
};

export const heyreachImportKeys = {
  all: ["heyreach", "imports"] as const,
  detail: (runId: string) => ["heyreach", "imports", runId] as const,
  leads: (runId: string) => ["heyreach", "imports", runId, "leads"] as const,
};

export function listHeyReachCampaigns(signal?: AbortSignal) {
  return apiFetch<HeyReachCampaign[]>("/heyreach/campaigns", { signal });
}

export function updateHeyReachSpeedToLead(campaignId: number, input: SpeedToLeadCampaignUpdate) {
  return apiFetch<HeyReachCampaign>(`/heyreach/campaigns/${campaignId}/speed-to-lead`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createHeyReachImport(input: CreateHeyReachImportInput) {
  return apiFetch<HeyReachImportRun>("/heyreach/imports", {
    method: "POST",
    headers: { "Idempotency-Key": newIdempotencyKey() },
    body: JSON.stringify(input),
  });
}

export function getHeyReachImport(runId: string, signal?: AbortSignal) {
  return apiFetch<HeyReachImportRun>(`/heyreach/imports/${runId}`, { signal });
}

export function listHeyReachImportLeads(
  runId: string,
  params: { limit?: number; offset?: number; signal?: AbortSignal } = {},
) {
  const search = new URLSearchParams();
  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const query = search.toString();
  return apiFetch<LeadListResponse>(`/heyreach/imports/${runId}/leads${query ? `?${query}` : ""}`, {
    signal: params.signal,
  });
}

export function heyreachCampaignLastImport(campaign: HeyReachCampaign) {
  return campaign.last_import ?? null;
}

export function heyreachCampaignImportIsActive(campaign: HeyReachCampaign) {
  const lastImport = heyreachCampaignLastImport(campaign);
  return Boolean(lastImport && importRunIsActive(lastImport.status));
}

export function heyreachCampaignHasActiveWork(campaign: HeyReachCampaign) {
  const lastImport = heyreachCampaignLastImport(campaign);
  if (!lastImport) {
    return false;
  }
  if (importRunIsActive(lastImport.status)) {
    return true;
  }
  return Boolean(
    lastImport.last_enrichment && phoneEnrichmentIsActive(lastImport.last_enrichment.status),
  );
}

export function anyHeyReachCampaignHasActiveWork(campaigns: HeyReachCampaign[]) {
  return campaigns.some(heyreachCampaignHasActiveWork);
}

export function heyreachLastImportFromRun(run: HeyReachImportRun): CampaignLastImport {
  return {
    id: run.id,
    status: run.status,
    campaign_ids: run.campaign_ids,
    reply_types: run.reply_types ?? [],
    leads_processed: run.leads_processed,
    conversations_processed: run.conversations_processed,
    qualifying_conversation_count: run.qualifying_conversation_count,
    errors: run.errors,
    started_at: run.started_at,
    completed_at: run.completed_at,
    last_enrichment: run.last_enrichment ?? null,
  };
}

export function withHeyReachSpeedToLead(
  campaigns: HeyReachCampaign[],
  updated: HeyReachCampaign,
): HeyReachCampaign[] {
  return campaigns.map((campaign) => {
    if (campaign.heyreach_campaign_id !== updated.heyreach_campaign_id) {
      return campaign;
    }
    return { ...campaign, ...updated };
  });
}

export function withHeyReachLastImport(
  campaigns: HeyReachCampaign[],
  campaignId: number,
  lastImport: CampaignLastImport,
): HeyReachCampaign[] {
  return campaigns.map((campaign) => {
    if (campaign.heyreach_campaign_id !== campaignId) {
      return campaign;
    }
    return {
      ...campaign,
      last_import_run_id: lastImport.id,
      last_imported_at: lastImport.completed_at ?? lastImport.started_at,
      last_import: lastImport,
    };
  });
}

export function withHeyReachLastEnrichment(
  campaigns: HeyReachCampaign[],
  campaignId: number,
  enrichment: PhoneEnrichmentSnapshot,
): HeyReachCampaign[] {
  return campaigns.map((campaign) => {
    if (campaign.heyreach_campaign_id !== campaignId) {
      return campaign;
    }
    const lastImport = heyreachCampaignLastImport(campaign);
    if (!lastImport) {
      return campaign;
    }
    return {
      ...campaign,
      last_import: { ...lastImport, last_enrichment: enrichment },
    };
  });
}

export { importRunCanEnrich, importRunIsActive };
export type { CampaignLastImport, ImportStatus };
