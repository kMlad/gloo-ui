import { describe, expect, it } from "vite-plus/test";
import {
  formatSdrHours,
  formatWorkDays,
  normalizeSlackChannelId,
  normalizeTime,
  SDR_TIMEZONE,
  sdrListItemSchema,
  sdrSettingsFormSchema,
  sdrSettingsFormValues,
  sdrSettingsUpdateFromForm,
  timeInputValue,
} from "@/lib/sdrs";

describe("SDR settings helpers", () => {
  it("normalizes Slack channel IDs and treats blanks as cleared", () => {
    expect(normalizeSlackChannelId(" C0C04R07874 ")).toBe("C0C04R07874");
    expect(normalizeSlackChannelId("")).toBeNull();
    expect(normalizeSlackChannelId("not-a-channel")).toBeNull();
  });

  it("normalizes API times for inputs and payloads", () => {
    expect(normalizeTime("09:00:00")).toBe("09:00:00");
    expect(normalizeTime("18:00")).toBe("18:00:00");
    expect(timeInputValue("09:00:00.000000")).toBe("09:00");
  });

  it("formats weekday ranges compactly", () => {
    expect(formatWorkDays([1, 2, 3, 4, 5])).toBe("Mon–Fri");
    expect(formatWorkDays([1, 2, 3, 4, 5, 6, 7])).toBe("Every day");
    expect(formatWorkDays([1, 3, 5])).toBe("Mon, Wed, Fri");
  });

  it("treats missing settings as always on", () => {
    expect(formatSdrHours(null)).toBe("Always on");
    expect(
      formatSdrHours({
        slack_channel_id: "C0C04R07874",
        timezone: SDR_TIMEZONE,
        work_days: [1, 2, 3, 4, 5],
        work_start: "09:00:00",
        work_end: "18:00:00",
      }),
    ).toBe("Mon–Fri 09:00–18:00");
  });

  it("builds a PATCH payload without timezone", () => {
    const values = sdrSettingsFormValues(null);
    expect(sdrSettingsUpdateFromForm({ ...values, slack_channel_id: "  " })).toEqual({
      slack_channel_id: null,
      work_days: [1, 2, 3, 4, 5],
      work_start: "09:00:00",
      work_end: "18:00:00",
    });
  });

  it("parses list items with locked Skopje timezone", () => {
    const configured = sdrListItemSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      email: "sdr@example.com",
      settings: {
        slack_channel_id: "C0C04R07874",
        timezone: "Europe/Skopje",
        work_days: [1, 2, 3, 4, 5],
        work_start: "09:00:00",
        work_end: "18:00:00",
      },
    });
    expect(configured.settings?.timezone).toBe(SDR_TIMEZONE);

    expect(
      sdrListItemSchema.safeParse({
        id: "11111111-1111-4111-8111-111111111111",
        email: "sdr@example.com",
        settings: {
          slack_channel_id: "C0C04R07874",
          timezone: "America/New_York",
          work_days: [1, 2, 3, 4, 5],
          work_start: "09:00:00",
          work_end: "18:00:00",
        },
      }).success,
    ).toBe(false);

    const unconfigured = sdrListItemSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      email: "sdr@example.com",
    });
    expect(unconfigured.settings).toBeNull();
  });

  it("rejects an empty schedule and an inverted work window", () => {
    const emptyDays = sdrSettingsFormSchema.safeParse({
      slack_channel_id: "",
      work_days: [],
      work_start: "09:00:00",
      work_end: "18:00:00",
    });
    expect(emptyDays.success).toBe(false);

    const inverted = sdrSettingsFormSchema.safeParse({
      slack_channel_id: "",
      work_days: [1],
      work_start: "18:00:00",
      work_end: "09:00:00",
    });
    expect(inverted.success).toBe(false);
  });
});
