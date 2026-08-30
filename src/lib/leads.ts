import { z } from "zod";
import { apiFetch } from "@/lib/api";

export const PHONE_SOURCES = [
  "smartlead_signature",
  "leadmagic",
  "prospeo",
  "airscale",
  "fullenrich",
] as const;
export const phoneSourceSchema = z.enum(PHONE_SOURCES);
export type PhoneSource = z.infer<typeof phoneSourceSchema>;
export const PHONE_SOURCE_LABELS: Record<PhoneSource, string> = {
  smartlead_signature: "SmartLead signature",
  leadmagic: "LeadMagic",
  prospeo: "Prospeo",
  airscale: "AirScale",
  fullenrich: "FullEnrich",
};

export const REPLY_TYPES = ["positive", "ooo"] as const;
export const replyTypeSchema = z.enum(REPLY_TYPES);
export type ReplyType = z.infer<typeof replyTypeSchema>;
export const REPLY_TYPE_LABELS: Record<ReplyType, string> = {
  positive: "Positive",
  ooo: "OOO",
};

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const leadListItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  smartlead_phone_number: z.string().nullable(),
  company_name: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  company_url: z.string().nullable(),
  linkedin_profile: z.string().nullable(),
  enriched_phone_number: z.string().nullable(),
  phone_source: phoneSourceSchema.nullable(),
  positive_conversation_count: z.number().int(),
  ooo_conversation_count: z.number().int(),
  latest_reply_at: z.string().nullable(),
});
export type LeadListItem = z.infer<typeof leadListItemSchema>;

export const leadListResponseSchema = z.object({
  items: z.array(leadListItemSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type LeadListResponse = z.infer<typeof leadListResponseSchema>;

export const leadReplySchema = z.object({
  id: z.string(),
  conversation_id: z.string().optional(),
  subject: z.string().nullable().optional(),
  body: z.string().optional(),
  sent_from: z.string().nullable().optional(),
  sent_to: z.string().nullable().optional(),
  received_at: z.string().nullable().optional(),
  message_properties: jsonRecordSchema.optional(),
});
export type LeadReply = z.infer<typeof leadReplySchema>;

export const leadConversationSchema = z.object({
  id: z.string(),
  smartlead_campaign_id: z.number().int().optional(),
  smartlead_campaign_lead_map_id: z.string().nullable().optional(),
  smartlead_lead_id: z.string().nullable().optional(),
  reply_type: replyTypeSchema.nullable().optional(),
  positive_category_name: z.string().nullable().optional(),
  qualified_at: z.string().nullable().optional(),
  lead_properties: jsonRecordSchema.optional(),
  custom_properties: jsonRecordSchema.optional(),
  replies: z.array(leadReplySchema).optional(),
});
export type LeadConversation = z.infer<typeof leadConversationSchema>;

export const leadDetailLeadSchema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  smartlead_phone_number: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  company_url: z.string().nullable().optional(),
  linkedin_profile: z.string().nullable().optional(),
  enriched_phone_number: z.string().nullable().optional(),
  phone_source: phoneSourceSchema.nullable().optional(),
  properties: jsonRecordSchema.optional(),
  custom_properties: jsonRecordSchema.optional(),
  source_observed_at: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type LeadDetailLead = z.infer<typeof leadDetailLeadSchema>;

export const leadDetailResponseSchema = z.object({
  lead: leadDetailLeadSchema,
  conversations: z.array(leadConversationSchema),
});
export type LeadDetailResponse = z.infer<typeof leadDetailResponseSchema>;

export const LEAD_PAGE_SIZE = 50;

export type ListLeadsParams = {
  limit?: number;
  offset?: number;
  replyType?: ReplyType | null;
  signal?: AbortSignal;
};

export type LeadListQueryParams = {
  limit: number;
  offset: number;
  replyType: ReplyType | null;
};

export const leadKeys = {
  all: ["leads"] as const,
  list: (params: LeadListQueryParams) => ["leads", "list", params] as const,
  detail: (leadId: string) => ["leads", leadId] as const,
};

export function listLeads(params: ListLeadsParams = {}) {
  const search = new URLSearchParams();
  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set("offset", String(params.offset));
  }
  if (params.replyType) {
    search.set("reply_type", params.replyType);
  }
  const query = search.toString();
  return apiFetch<LeadListResponse>(`/leads${query ? `?${query}` : ""}`, {
    signal: params.signal,
  });
}

export function getLead(leadId: string, signal?: AbortSignal) {
  return apiFetch<LeadDetailResponse>(`/leads/${leadId}`, { signal });
}

export function leadDisplayName(lead: {
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}) {
  const name = [lead.first_name, lead.last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();
  return name || lead.email;
}

export function leadPhone(lead: {
  enriched_phone_number?: string | null;
  smartlead_phone_number?: string | null;
}) {
  const enriched = lead.enriched_phone_number?.trim();
  if (enriched) {
    return enriched;
  }
  const smartlead = lead.smartlead_phone_number?.trim();
  return smartlead || null;
}

export function phoneSourceLabel(source: string | null | undefined) {
  if (source && source in PHONE_SOURCE_LABELS) {
    return PHONE_SOURCE_LABELS[source as PhoneSource];
  }
  return source ?? null;
}

export function replyTypeLabel(replyType: string | null | undefined) {
  if (replyType && replyType in REPLY_TYPE_LABELS) {
    return REPLY_TYPE_LABELS[replyType as ReplyType];
  }
  return replyType ?? null;
}

export function hrefFromUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  return `https://${trimmed}`;
}

export function propertyEntries(record: Record<string, unknown> | null | undefined) {
  if (!record) {
    return [];
  }
  return Object.entries(record).filter(([, value]) => {
    if (value == null) {
      return false;
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === "object") {
      return Object.keys(value).length > 0;
    }
    return true;
  });
}

export function formatPropertyValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
