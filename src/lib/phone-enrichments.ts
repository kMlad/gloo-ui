import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api";
import { phoneSourceSchema } from "@/lib/leads";

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
const phoneEnrichmentSelectionModeSchema = z.enum(["selected", "eligible", "import_run"]);

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

export const phoneEnrichmentSnapshotSchema = z.object({
  id: z.string().uuid(),
  status: phoneEnrichmentStatusSchema,
  selection_mode: phoneEnrichmentSelectionModeSchema.nullable().optional(),
  source_import_run_id: z.string().uuid().nullable().optional(),
  leads_selected: z.number().int().default(0),
  leads_enriched: z.number().int().default(0),
  leads_not_found: z.number().int().default(0),
  leads_skipped: z.number().int().default(0),
  leads_failed: z.number().int().default(0),
  errors: z.array(jsonRecordSchema).default([]),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PhoneEnrichmentSnapshot = z.infer<typeof phoneEnrichmentSnapshotSchema>;

export const phoneEnrichmentRunSchema = phoneEnrichmentSnapshotSchema.extend({
  idempotency_key: z.string(),
  request_fingerprint: z.string(),
  selection_mode: phoneEnrichmentSelectionModeSchema,
  requested_lead_ids: z.array(z.string().uuid()),
  created_by: z.string().uuid().nullable().optional(),
  requested_limit: z.number().int(),
  fullenrich_job_id: z.string().nullable(),
  last_reconciled_at: z.string().nullable(),
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
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(input),
  });
}

export function getPhoneEnrichment(runId: string, signal?: AbortSignal) {
  return apiFetch<PhoneEnrichmentRun>(`/phone-enrichments/${runId}`, { signal });
}

export async function getLatestPhoneEnrichmentForImport(
  importRunId: string,
  signal?: AbortSignal,
): Promise<PhoneEnrichmentRun | null> {
  try {
    return await apiFetch<PhoneEnrichmentRun>(
      `/phone-enrichments?source_import_run_id=${encodeURIComponent(importRunId)}`,
      { signal },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export function phoneEnrichmentSnapshotFromRun(
  run: PhoneEnrichmentSnapshot,
): PhoneEnrichmentSnapshot {
  return {
    id: run.id,
    status: run.status,
    selection_mode: run.selection_mode,
    source_import_run_id: run.source_import_run_id,
    leads_selected: run.leads_selected,
    leads_enriched: run.leads_enriched,
    leads_not_found: run.leads_not_found,
    leads_skipped: run.leads_skipped,
    leads_failed: run.leads_failed,
    errors: run.errors,
    started_at: run.started_at,
    completed_at: run.completed_at,
    created_at: run.created_at,
    updated_at: run.updated_at,
  };
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
