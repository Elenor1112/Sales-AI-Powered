import { Role } from "@prisma/client";

import { ForbiddenError } from "@/lib/errors";
import type { RequestSession } from "@/server/auth/session";

export type Permission =
  | "manageUsers"
  | "manageSalesTeams"
  | "manageMetaIntegration"
  | "configureAssignmentRules"
  | "configureAssignmentSettings"
  | "viewAllAnalytics"
  | "viewTeamAnalytics"
  | "manageAllLeads"
  | "manageTeamLeads"
  | "viewOwnLeads"
  | "assignAnyLead"
  | "assignTeamLead"
  | "reassignOwnLead"
  | "viewUnassignedLeads"
  | "manageDeals"
  | "manageTasks"
  | "viewAssignmentHistory"
  | "viewOwnAssignmentHistory";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    "manageUsers",
    "manageSalesTeams",
    "manageMetaIntegration",
    "configureAssignmentRules",
    "configureAssignmentSettings",
    "viewAllAnalytics",
    "viewTeamAnalytics",
    "manageAllLeads",
    "manageTeamLeads",
    "viewOwnLeads",
    "assignAnyLead",
    "assignTeamLead",
    "reassignOwnLead",
    "viewUnassignedLeads",
    "manageDeals",
    "manageTasks",
    "viewAssignmentHistory",
    "viewOwnAssignmentHistory",
  ],
  [Role.SALES_MANAGER]: [
    "manageSalesTeams",
    "configureAssignmentRules",
    "viewTeamAnalytics",
    "manageTeamLeads",
    "viewOwnLeads",
    "assignTeamLead",
    "viewUnassignedLeads",
    "manageDeals",
    "manageTasks",
    "viewAssignmentHistory",
    "viewOwnAssignmentHistory",
  ],
  [Role.SALES_REP]: [
    "viewOwnLeads",
    "manageTasks",
    "reassignOwnLead",
    "viewOwnAssignmentHistory",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function assertPermission(session: RequestSession, permission: Permission): void {
  if (!hasPermission(session.role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}

export function hasRole(session: RequestSession, roles: Role[]): boolean {
  return roles.includes(session.role);
}

export function assertRole(session: RequestSession, roles: Role[]): void {
  if (!hasRole(session, roles)) {
    throw new ForbiddenError(`Requires one of roles: ${roles.join(", ")}`);
  }
}
