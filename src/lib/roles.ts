import { z } from "zod";
import rolesJson from "@/lib/roles.json";

export const roles = rolesJson;

export const roleIds = roles.map((role) => role.id) as [
  (typeof roles)[number]["id"],
  ...(typeof roles)[number]["id"][],
];

export const appRoleSchema = z.enum(roleIds);

export type AppRole = z.infer<typeof appRoleSchema>;

export const ADMIN_ROLE = "admin" as const satisfies AppRole;

export function isAdminRole(role: string | undefined | null): boolean {
  return role === ADMIN_ROLE;
}
