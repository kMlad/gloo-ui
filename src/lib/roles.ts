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

export const INVITE_PERMISSIONS = {
  admin: ["admin", "sales_lead", "sdr"],
  sales_lead: ["sdr"],
  sdr: [],
} as const satisfies Record<AppRole, readonly AppRole[]>;

export function getInvitableRoles(role: AppRole | null | undefined) {
  if (!role) {
    return [];
  }
  const allowed = new Set<AppRole>(INVITE_PERMISSIONS[role]);
  return roles.filter((entry) => allowed.has(entry.id));
}

export function canInvite(role: AppRole | null | undefined): boolean {
  return getInvitableRoles(role).length > 0;
}
