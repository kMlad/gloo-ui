import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { appRoleSchema } from "@/lib/roles";

export const inviteUserSchema = z.object({
  email: z.email(),
  role: appRoleSchema,
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export function inviteUser(input: InviteUserInput) {
  return apiFetch("/auth/users/invite", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
