import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { replyTypeSchema, type LeadListResponse, type ReplyType } from "@/lib/leads";

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
  created_at: z.string(),
  updated_at: z.string(),
});
export type Campaign = z.infer<typeof campaignSchema>;

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
});
export type ImportRun = z.infer<typeof importRunSchema>;

export const importRunListResponseSchema = z.object({
  items: z.array(importRunSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type ImportRunListResponse = z.infer<typeof importRunListResponseSchema>;

export const IMPORT_PAGE_SIZE = 25;

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

export function importRunCanEnrich(run: ImportRun) {
  return (run.status === "succeeded" || run.status === "partial") && run.leads_processed > 0;
}

export function importStatusLabel(status: string) {
  if (status in IMPORT_STATUS_LABELS) {
    return IMPORT_STATUS_LABELS[status as ImportStatus];
  }
  return status;
}
