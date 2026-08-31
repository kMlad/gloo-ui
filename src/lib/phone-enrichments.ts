import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { phoneSourceSchema } from "@/lib/leads";
import { newIdempotencyKey } from "@/lib/smartlead";

export const PHONE_ENRICHMENT_STATUSES = [
  "queued",
  "running",
  "waiting",
  "succeeded",
  "partial",
  "failed",
] as const;
export const phoneEnrichmentStatusSchema = z.enum(PHONE_ENRICHMENT_STATUSES);
export type PhoneEnrichmentStatus = z.infer<typeof phoneEnrichmentStatusSchema>;
export const PHONE_ENRICHMENT_STATUS_LABELS: Record<PhoneEnrichmentStatus, string> = {
  queued: "Queued",
  running: "Running",
  waiting: "Waiting",
  succeeded: "Succeeded",
  partial: "Partial",
  failed: "Failed",
};

export const PHONE_ENRICHMENT_ITEM_STATUSES = [
  "queued",
  "running",
  "waiting",
  "enriched",
  "not_found",
  "skipped_existing",
  "skipped_active",
  "failed",
] as const;
export const phoneEnrichmentItemStatusSchema = z.enum(PHONE_ENRICHMENT_ITEM_STATUSES);
export type PhoneEnrichmentItemStatus = z.infer<typeof phoneEnrichmentItemStatusSchema>;

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const phoneEnrichmentItemSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  status: phoneEnrichmentItemStatusSchema,
  final_phone_number: z.string().nullable(),
  final_source: phoneSourceSchema.nullable(),
  had_provider_error: z.boolean(),
  error_message: z.string().nullable(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PhoneEnrichmentItem = z.infer<typeof phoneEnrichmentItemSchema>;

export const phoneEnrichmentRunSchema = z.object({
  id: z.string().uuid(),
  idempotency_key: z.string(),
  request_fingerprint: z.string(),
  selection_mode: z.enum(["selected", "eligible", "import_run"]),
  requested_lead_ids: z.array(z.string().uuid()),
  source_import_run_id: z.string().uuid().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  requested_limit: z.number().int(),
  status: phoneEnrichmentStatusSchema,
  leads_selected: z.number().int(),
  leads_enriched: z.number().int(),
  leads_not_found: z.number().int(),
  leads_skipped: z.number().int(),
  leads_failed: z.number().int(),
  fullenrich_job_id: z.string().nullable(),
  errors: z.array(jsonRecordSchema),
  last_reconciled_at: z.string().nullable(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  items: z.array(phoneEnrichmentItemSchema).optional(),
});
export type PhoneEnrichmentRun = z.infer<typeof phoneEnrichmentRunSchema>;

export type CreatePhoneEnrichmentInput = {
  source_import_run_id: string;
};

export const phoneEnrichmentKeys = {
  all: ["phone-enrichments"] as const,
  detail: (runId: string) => ["phone-enrichments", runId] as const,
  byImport: (importId: string) => ["phone-enrichments", "import", importId] as const,
};

export function createPhoneEnrichment(input: CreatePhoneEnrichmentInput) {
  return apiFetch<PhoneEnrichmentRun>("/phone-enrichments", {
    method: "POST",
    headers: { "Idempotency-Key": newIdempotencyKey() },
    body: JSON.stringify(input),
  });
}

export function getPhoneEnrichment(runId: string, signal?: AbortSignal) {
  return apiFetch<PhoneEnrichmentRun>(`/phone-enrichments/${runId}`, { signal });
}

export function phoneEnrichmentIsActive(status: PhoneEnrichmentStatus) {
  return status === "queued" || status === "running" || status === "waiting";
}

export function phoneEnrichmentStatusLabel(status: string) {
  if (status in PHONE_ENRICHMENT_STATUS_LABELS) {
    return PHONE_ENRICHMENT_STATUS_LABELS[status as PhoneEnrichmentStatus];
  }
  return status;
}
