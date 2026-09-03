import type { AssignmentMethod, AssignmentStrategy } from "@prisma/client";

export interface EligibleMember {
  userId: string;
  assignmentWeight: number;
  maxActiveLeads: number | null;
  activeLeadCount: number;
  lastAssignedAt: Date | null;
}

export interface AssignmentStateSnapshot {
  roundRobinIndex: number;
  lastAssignedUserId: string | null;
}

export interface StrategySelection {
  userId: string;
  nextRoundRobinIndex: number;
  nextLastAssignedUserId: string;
}

export type AssignmentTrigger = "AUTO" | "MANUAL" | "RETRY";

export interface AssignLeadInput {
  leadId: string;
  organizationId: string;
  trigger: AssignmentTrigger;
  triggeredByUserId?: string;
  targetUserId?: string;
  targetTeamId?: string;
  reason?: string;
  allowOverrideEligibility?: boolean;
}

export interface AssignLeadResult {
  status: "ASSIGNED" | "UNASSIGNED" | "ALREADY_ASSIGNED";
  leadId: string;
  assignedUserId?: string;
  teamId?: string;
  method?: AssignmentMethod;
  strategy?: AssignmentStrategy;
  ruleId?: string;
  reason?: string;
}
