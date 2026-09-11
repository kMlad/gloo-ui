import { z } from "zod";
import { apiFetch } from "@/lib/api";

export const SDR_TIMEZONE = "Europe/Skopje" as const;
export const DEFAULT_SDR_WORK_DAYS = [1, 2, 3, 4, 5] as const;
export const DEFAULT_SDR_WORK_START = "09:00:00";
export const DEFAULT_SDR_WORK_END = "18:00:00";

export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type IsoWeekday = (typeof ISO_WEEKDAYS)[number];

export const ISO_WEEKDAY_LABELS: Record<IsoWeekday, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

const SLACK_CHANNEL_ID_RE = /^[CGD][A-Z0-9]+$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

export const sdrTimeSchema = z.string().regex(TIME_RE, "Enter a valid time");

export const sdrTimezoneSchema = z.literal(SDR_TIMEZONE);

export const sdrSettingsSchema = z.object({
  slack_channel_id: z.string().nullable().optional().default(null),
  timezone: sdrTimezoneSchema.default(SDR_TIMEZONE),
  work_days: z.array(z.number().int().min(1).max(7)).default(() => [...DEFAULT_SDR_WORK_DAYS]),
  work_start: sdrTimeSchema.default(DEFAULT_SDR_WORK_START),
  work_end: sdrTimeSchema.default(DEFAULT_SDR_WORK_END),
});
export type SdrSettings = z.infer<typeof sdrSettingsSchema>;

export const sdrSettingsUpdateSchema = z.object({
  slack_channel_id: z.string().nullable().optional(),
  work_days: z.array(z.number().int().min(1).max(7)).optional(),
  work_start: sdrTimeSchema.optional(),
  work_end: sdrTimeSchema.optional(),
});
export type SdrSettingsUpdate = z.infer<typeof sdrSettingsUpdateSchema>;

export const sdrListItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  settings: sdrSettingsSchema.nullable().optional().default(null),
});
export type SdrListItem = z.infer<typeof sdrListItemSchema>;

export const sdrSettingsFormSchema = z
  .object({
    slack_channel_id: z.string(),
    work_days: z.array(z.number().int().min(1).max(7)).min(1, "Choose at least one work day"),
    work_start: sdrTimeSchema,
    work_end: sdrTimeSchema,
  })
  .superRefine((value, ctx) => {
    const channel = normalizeSlackChannelId(value.slack_channel_id);
    if (value.slack_channel_id.trim() && channel === null) {
      ctx.addIssue({
        code: "custom",
        path: ["slack_channel_id"],
        message: "Use a Slack channel ID starting with C, G, or D",
      });
    }
    const start = timeToMinutes(value.work_start);
    const end = timeToMinutes(value.work_end);
    if (start === null || end === null) {
      ctx.addIssue({
        code: "custom",
        path: ["work_start"],
        message: "Enter a valid time",
      });
      return;
    }
    if (start >= end) {
      ctx.addIssue({
        code: "custom",
        path: ["work_end"],
        message: "End time must be after start time",
      });
    }
  });
export type SdrSettingsFormValues = z.infer<typeof sdrSettingsFormSchema>;

export const sdrKeys = {
  all: ["sdrs"] as const,
};

export async function listSdrs(signal?: AbortSignal) {
  const data = await apiFetch<unknown>("/users/sdrs", { signal });
  return z.array(sdrListItemSchema).parse(data);
}

export async function updateSdrSettings(sdrId: string, input: SdrSettingsUpdate) {
  const data = await apiFetch<unknown>(`/users/sdrs/${sdrId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return sdrListItemSchema.parse(data);
}

export function sdrEmailById(sdrs: SdrListItem[]) {
  return Object.fromEntries(sdrs.map((sdr) => [sdr.id, sdr.email]));
}

export function withSdrSettings(sdrs: SdrListItem[], updated: SdrListItem) {
  return sdrs.map((sdr) => (sdr.id === updated.id ? updated : sdr));
}

export function defaultSdrSettings(): SdrSettings {
  return {
    slack_channel_id: null,
    timezone: SDR_TIMEZONE,
    work_days: [...DEFAULT_SDR_WORK_DAYS],
    work_start: DEFAULT_SDR_WORK_START,
    work_end: DEFAULT_SDR_WORK_END,
  };
}

export function sdrSettingsFormValues(
  settings: SdrSettings | null | undefined,
): SdrSettingsFormValues {
  const current = settings ?? defaultSdrSettings();
  return {
    slack_channel_id: current.slack_channel_id ?? "",
    work_days: [...current.work_days],
    work_start: normalizeTime(current.work_start) ?? DEFAULT_SDR_WORK_START,
    work_end: normalizeTime(current.work_end) ?? DEFAULT_SDR_WORK_END,
  };
}

export function sdrSettingsUpdateFromForm(values: SdrSettingsFormValues): SdrSettingsUpdate {
  return {
    slack_channel_id: normalizeSlackChannelId(values.slack_channel_id),
    work_days: uniqueSortedWorkDays(values.work_days),
    work_start: normalizeTime(values.work_start) ?? values.work_start,
    work_end: normalizeTime(values.work_end) ?? values.work_end,
  };
}

export function normalizeSlackChannelId(value: string): string | null {
  const channelId = value.trim();
  if (!channelId) {
    return null;
  }
  return SLACK_CHANNEL_ID_RE.test(channelId) ? channelId : null;
}

export function normalizeTime(value: string): string | null {
  const match = TIME_RE.exec(value.trim());
  if (!match) {
    return null;
  }
  return `${match[1]}:${match[2]}:${match[3] ?? "00"}`;
}

export function timeInputValue(value: string): string {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return value;
  }
  return normalized.slice(0, 5);
}

export function timeToMinutes(value: string): number | null {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return null;
  }
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

export function uniqueSortedWorkDays(days: number[]): IsoWeekday[] {
  return [...new Set(days)]
    .filter((day): day is IsoWeekday => day >= 1 && day <= 7)
    .sort((left, right) => left - right);
}

export function formatTime(value: string): string {
  return timeInputValue(value);
}

export function formatWorkDays(days: number[]): string {
  const sorted = uniqueSortedWorkDays(days);
  if (sorted.length === 0) {
    return "No days";
  }
  if (sorted.length === 7) {
    return "Every day";
  }
  if (isConsecutive(sorted)) {
    return `${ISO_WEEKDAY_LABELS[sorted[0]]}–${ISO_WEEKDAY_LABELS[sorted[sorted.length - 1]]}`;
  }
  return sorted.map((day) => ISO_WEEKDAY_LABELS[day]).join(", ");
}

export function formatSdrHours(settings: SdrSettings | null | undefined): string {
  if (!settings) {
    return "Always on";
  }
  return `${formatWorkDays(settings.work_days)} ${formatTime(settings.work_start)}–${formatTime(settings.work_end)}`;
}

export function formatSdrSlackChannel(settings: SdrSettings | null | undefined): string {
  return settings?.slack_channel_id?.trim() || "No channel";
}

function isConsecutive(days: IsoWeekday[]): boolean {
  if (days.length < 2) {
    return false;
  }
  return days.every((day, index) => index === 0 || day === days[index - 1] + 1);
}
