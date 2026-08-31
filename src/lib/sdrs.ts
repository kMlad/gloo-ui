import { z } from "zod";
import { apiFetch } from "@/lib/api";

export const sdrListItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
});
export type SdrListItem = z.infer<typeof sdrListItemSchema>;

export const sdrKeys = {
  all: ["sdrs"] as const,
};

export function listSdrs(signal?: AbortSignal) {
  return apiFetch<SdrListItem[]>("/users/sdrs", { signal });
}

export function sdrEmailById(sdrs: SdrListItem[]) {
  return Object.fromEntries(sdrs.map((sdr) => [sdr.id, sdr.email]));
}
