import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { leadListItemSchema, leadPlatformSchema } from "@/lib/leads";
import { phoneEnrichmentIsActive, phoneEnrichmentSnapshotSchema } from "@/lib/phone-enrichments";

export const SPEED_TO_LEAD_PAGE_SIZE = 50;
export const SPEED_TO_LEAD_POLL_IDLE_MS = 30_000;
export const SPEED_TO_LEAD_POLL_ACTIVE_MS = 2_000;

export const SPEED_TO_LEAD_NOTIFICATION_STATUSES = [
  "pending",
  "sent",
  "failed",
  "skipped",
] as const;
export const speedToLeadNotificationStatusSchema = z.enum(SPEED_TO_LEAD_NOTIFICATION_STATUSES);
export type SpeedToLeadNotificationStatus = z.infer<typeof speedToLeadNotificationStatusSchema>;

export type SpeedToLeadCampaignUpdate = {
  enabled: boolean;
  sdr_id?: string | null;
};

export const speedToLeadEventItemSchema = z.object({
  id: z.string().uuid(),
  platform: leadPlatformSchema,
  lead_id: z.string().uuid(),
  smartlead_campaign_id: z.number().int().nullable().optional(),
  heyreach_campaign_id: z.number().int().nullable().optional(),
  conversation_id: z.string().uuid(),
  category_id: z.number().int().nullable().optional(),
  category_name: z.string().nullable().optional(),
  reply_excerpt: z.string().nullable().optional(),
  replied_at: z.string(),
  dedupe_key: z.string(),
  enrichment_run_id: z.string().uuid().nullable().optional(),
  notification_status: speedToLeadNotificationStatusSchema.optional().default("pending"),
  notification_error: z.string().nullable().optional(),
  slack_message_ts: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  campaign_name: z.string(),
  lead: leadListItemSchema,
  enrichment: phoneEnrichmentSnapshotSchema.nullable().optional(),
});
export type SpeedToLeadEventItem = z.infer<typeof speedToLeadEventItemSchema>;

export const speedToLeadListResponseSchema = z.object({
  items: z.array(speedToLeadEventItemSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type SpeedToLeadListResponse = z.infer<typeof speedToLeadListResponseSchema>;

export type SpeedToLeadListParams = {
  limit?: number;
  offset?: number;
  includeHandled?: boolean;
  signal?: AbortSignal;
};

export type SpeedToLeadListQueryParams = {
  limit: number;
  offset: number;
  includeHandled: boolean;
};

export const speedToLeadKeys = {
  all: ["speed-to-lead"] as const,
  list: (params: SpeedToLeadListQueryParams) => ["speed-to-lead", "list", params] as const,
  unhandledCount: ["speed-to-lead", "unhandled-count"] as const,
};

export function listSpeedToLeadEvents(params: SpeedToLeadListParams = {}) {
  const search = new URLSearchParams();
  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  if (params.includeHandled) {
    search.set("include_handled", "true");
  }
  const query = search.toString();
  return apiFetch<SpeedToLeadListResponse>(`/speed-to-lead${query ? `?${query}` : ""}`, {
    signal: params.signal,
  });
}

export function speedToLeadQueueHasActiveEnrichment(items: SpeedToLeadEventItem[]) {
  return items.some(
    (item) => item.enrichment != null && phoneEnrichmentIsActive(item.enrichment.status),
  );
}

export function speedToLeadPollInterval(items: SpeedToLeadEventItem[]) {
  return speedToLeadQueueHasActiveEnrichment(items)
    ? SPEED_TO_LEAD_POLL_ACTIVE_MS
    : SPEED_TO_LEAD_POLL_IDLE_MS;
}

export function formatTimeSince(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return iso;
  }
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 45) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
