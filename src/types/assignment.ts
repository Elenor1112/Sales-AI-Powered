import type {
  AssignmentHistory,
  AssignmentMethod,
  AssignmentRule,
  AssignmentSettings,
  AssignmentStrategy,
} from "@prisma/client";

export type AssignmentRuleWithTeam = AssignmentRule & {
  team: { id: string; name: string };
};

export type AssignmentHistoryWithNames = AssignmentHistory & {
  previousUser: { id: string; name: string } | null;
  newUser: { id: string; name: string } | null;
  previousTeam: { id: string; name: string } | null;
  newTeam: { id: string; name: string } | null;
  changedByUser: { id: string; name: string } | null;
};

export interface WorkloadEntry {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isActive: boolean;
  isPaused: boolean;
  teamId: string;
  teamName: string;
  assignmentWeight: number;
  maxActiveLeads: number | null;
  activeLeadCount: number;
  capacityUtilization: number | null;
  wonLeadCount: number;
  totalAssignedCount: number;
  lastAssignedAt: string | null;
}

export interface UnassignedLeadEntry {
  id: string;
  name: string;
  source: string;
  createdAt: string;
  waitingMs: number;
  assignmentStatus: string;
  failureReason: string | null;
  matchingTeamId: string | null;
  matchingRuleId: string | null;
}

export type { AssignmentSettings, AssignmentHistory, AssignmentMethod, AssignmentStrategy };
