import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { replyTypeSchema, type LeadListResponse, type ReplyType } from "@/lib/leads";
import {
  phoneEnrichmentIsActive,
  phoneEnrichmentSnapshotSchema,
  type PhoneEnrichmentSnapshot,
} from "@/lib/phone-enrichments";

export const IMPORT_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "partial",
  "failed",
  "rejected",
] as const;
export const importStatusSchema = z.enum(IMPORT_STATUSES);
export type ImportStatus = z.infer<typeof importStatusSchema>;
export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  partial: "Partial",
  failed: "Failed",
  rejected: "Rejected",
};

const jsonRecordSchema = z.record(z.string(), z.unknown());
const emptyLastImports = { positive: null, ooo: null } as const;

export const campaignLastImportSchema = z.object({
  id: z.string().uuid(),
  status: importStatusSchema,
  campaign_ids: z.array(z.number().int()).default([]),
  reply_types: z.array(replyTypeSchema).default([]),
  leads_processed: z.number().int().default(0),
  conversations_processed: z.number().int().default(0),
  qualifying_conversation_count: z.number().int().default(0),
  errors: z.array(jsonRecordSchema).default([]),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  last_enrichment: phoneEnrichmentSnapshotSchema.nullable().optional(),
});
export type CampaignLastImport = z.infer<typeof campaignLastImportSchema>;

export const campaignLastImportsSchema = z
  .object({
    positive: campaignLastImportSchema.nullable(),
    ooo: campaignLastImportSchema.nullable(),
  })
  .default(emptyLastImports);
export type CampaignLastImports = z.infer<typeof campaignLastImportsSchema>;

export const campaignSchema = z.object({
  smartlead_campaign_id: z.number().int(),
  name: z.string(),
  enabled: z.boolean(),
  reply_types: z.array(replyTypeSchema),
  status: z.string().nullable().optional(),
  tags: z.array(z.record(z.string(), z.unknown())).optional(),
  ever_imported: z.boolean().default(false),
  imported_lead_count: z.number().int().default(0),
  positive_lead_count: z.number().int().default(0),
  ooo_lead_count: z.number().int().default(0),
  last_imported_at: z.string().nullable().optional(),
  last_import_run_id: z.string().uuid().nullable().optional(),
  last_imports: campaignLastImportsSchema,
  speed_to_lead_enabled: z.boolean().optional().default(false),
  speed_to_lead_sdr_id: z.string().uuid().nullable().optional().default(null),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Campaign = z.infer<typeof campaignSchema>;

export type SpeedToLeadCampaignUpdate = {
  enabled: boolean;
  sdr_id?: string | null;
};

export const importRunSchema = z.object({
  id: z.string().uuid(),
  status: importStatusSchema,
  campaign_ids: z.array(z.number().int()),
  reply_types: z.array(replyTypeSchema),
  reply_time_from: z.string().nullable(),
  reply_time_to: z.string().nullable(),
  requested_by: z.string().uuid().nullable().optional(),
  idempotency_key: z.string().nullable().optional(),
  resolved_categories: z.record(z.string(), z.array(jsonRecordSchema)).optional(),
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
export type ImportRun = z.infer<typeof importRunSchema>;

export const importRunListResponseSchema = z.object({
  items: z.array(importRunSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type ImportRunListResponse = z.infer<typeof importRunListResponseSchema>;

export type ListImportsParams = {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
};

export type ImportListQueryParams = {
  limit: number;
  offset: number;
};

export type CreateImportInput = {
  campaign_ids: number[];
  reply_types: ReplyType[];
};

export const campaignKeys = {
  all: ["smartlead", "campaigns"] as const,
};

export const importKeys = {
  all: ["smartlead", "imports"] as const,
  list: (params: ImportListQueryParams) => ["smartlead", "imports", "list", params] as const,
  detail: (runId: string) => ["smartlead", "imports", runId] as const,
  leads: (runId: string) => ["smartlead", "imports", runId, "leads"] as const,
};

export function newIdempotencyKey() {
  return crypto.randomUUID();
}

export function listCampaigns(signal?: AbortSignal) {
  return apiFetch<Campaign[]>("/smartlead/campaigns", { signal });
}

export function updateSpeedToLead(campaignId: number, input: SpeedToLeadCampaignUpdate) {
  return apiFetch<Campaign>(`/smartlead/campaigns/${campaignId}/speed-to-lead`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createImport(input: CreateImportInput) {
  return apiFetch<ImportRun>("/smartlead/imports", {
    method: "POST",
    headers: { "Idempotency-Key": newIdempotencyKey() },
    body: JSON.stringify(input),
  });
}

export function listImports(params: ListImportsParams = {}) {
  const search = new URLSearchParams();
  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  const query = search.toString();
  return apiFetch<ImportRunListResponse>(`/smartlead/imports${query ? `?${query}` : ""}`, {
    signal: params.signal,
  });
}

export function getImport(runId: string, signal?: AbortSignal) {
  return apiFetch<ImportRun>(`/smartlead/imports/${runId}`, { signal });
}

export function listImportLeads(
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
  return apiFetch<LeadListResponse>(
    `/smartlead/imports/${runId}/leads${query ? `?${query}` : ""}`,
    { signal: params.signal },
  );
}

export function importRunIsActive(status: ImportStatus) {
  return status === "queued" || status === "running";
}

export function importRunCanEnrich(run: { status: ImportStatus; leads_processed: number }) {
  return (run.status === "succeeded" || run.status === "partial") && run.leads_processed > 0;
}

export function campaignLastImports(campaign: Campaign): CampaignLastImports {
  return campaign.last_imports ?? emptyLastImports;
}

export function campaignLastImport(campaign: Campaign, replyType: ReplyType) {
  return campaignLastImports(campaign)[replyType];
}

export function campaignImportIsActive(campaign: Campaign, replyType: ReplyType) {
  const lastImport = campaignLastImport(campaign, replyType);
  return Boolean(lastImport && importRunIsActive(lastImport.status));
}

export function campaignHasActiveWork(campaign: Campaign) {
  return (["positive", "ooo"] as const).some((replyType) => {
    const lastImport = campaignLastImport(campaign, replyType);
    if (!lastImport) {
      return false;
    }
    if (importRunIsActive(lastImport.status)) {
      return true;
    }
    return Boolean(
      lastImport.last_enrichment && phoneEnrichmentIsActive(lastImport.last_enrichment.status),
    );
  });
}

export function anyCampaignHasActiveWork(campaigns: Campaign[]) {
  return campaigns.some(campaignHasActiveWork);
}

export function importScopeKey(campaignId: number, replyType: ReplyType) {
  return `${campaignId}:${replyType}`;
}

export function campaignLastImportFromRun(run: ImportRun): CampaignLastImport {
  return {
    id: run.id,
    status: run.status,
    campaign_ids: run.campaign_ids,
    reply_types: run.reply_types,
    leads_processed: run.leads_processed,
    conversations_processed: run.conversations_processed,
    qualifying_conversation_count: run.qualifying_conversation_count,
    errors: run.errors,
    started_at: run.started_at,
    completed_at: run.completed_at,
    last_enrichment: run.last_enrichment ?? null,
  };
}

export function withCampaignLastImport(
  campaigns: Campaign[],
  campaignId: number,
  replyType: ReplyType,
  lastImport: CampaignLastImport,
): Campaign[] {
  return campaigns.map((campaign) => {
    if (campaign.smartlead_campaign_id !== campaignId) {
      return campaign;
    }
    return {
      ...campaign,
      last_import_run_id: lastImport.id,
      last_imported_at: lastImport.completed_at ?? lastImport.started_at,
      last_imports: {
        ...campaignLastImports(campaign),
        [replyType]: lastImport,
      },
    };
  });
}

export function withCampaignSpeedToLead(campaigns: Campaign[], updated: Campaign): Campaign[] {
  return campaigns.map((campaign) => {
    if (campaign.smartlead_campaign_id !== updated.smartlead_campaign_id) {
      return campaign;
    }
    return { ...campaign, ...updated };
  });
}

export function withCampaignLastEnrichment(
  campaigns: Campaign[],
  campaignId: number,
  replyType: ReplyType,
  enrichment: PhoneEnrichmentSnapshot,
): Campaign[] {
  return campaigns.map((campaign) => {
    if (campaign.smartlead_campaign_id !== campaignId) {
      return campaign;
    }
    const lastImport = campaignLastImport(campaign, replyType);
    if (!lastImport) {
      return campaign;
    }
    return {
      ...campaign,
      last_imports: {
        ...campaignLastImports(campaign),
        [replyType]: { ...lastImport, last_enrichment: enrichment },
      },
    };
  });
}

export function importStatusLabel(status: string) {
  if (status in IMPORT_STATUS_LABELS) {
    return IMPORT_STATUS_LABELS[status as ImportStatus];
  }
  return status;
}
