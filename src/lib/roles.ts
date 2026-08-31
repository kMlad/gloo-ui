import { z } from "zod";
import rolesJson from "@/lib/roles.json";

const invitePermissions = {
  admin: ["admin", "sales_lead", "sdr"],
  sales_lead: ["sdr"],
  sdr: [],
} as const;

export type AppRole = keyof typeof invitePermissions;

export const INVITE_PERMISSIONS: Record<AppRole, readonly AppRole[]> =
  invitePermissions;

export const roleIds = Object.keys(INVITE_PERMISSIONS) as [
  AppRole,
  ...AppRole[],
];

export const appRoleSchema = z.enum(roleIds);

export const roles = rolesJson.map((role) => ({
  ...role,
  id: appRoleSchema.parse(role.id),
}));

export const ADMIN_ROLE = "admin" as const satisfies AppRole;

export function isAdminRole(role: string | undefined | null): boolean {
  return role === ADMIN_ROLE;
}

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

export function canManageSmartlead(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "sales_lead";
}

export function canAssignLeads(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "sales_lead";
}
