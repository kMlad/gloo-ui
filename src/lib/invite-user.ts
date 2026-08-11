import { z } from "zod";
import { appRoleSchema } from "@/lib/roles";

export const inviteUserSchema = z.object({
  email: z.email(),
  role: appRoleSchema,
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
