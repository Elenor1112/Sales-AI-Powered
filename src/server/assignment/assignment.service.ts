import { AssignmentMethod, AssignmentStrategy, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getOrCreateSettings } from "@/server/repositories/assignment-settings.repository";
import { getEligibleMembers } from "./assignment.capacity";
import { roundRobin, leastAssigned, weightedRoundRobin, manual } from "./assignment.strategies";
import * as repo from "./assignment.repository";
import {
  notifyLeadAssigned,
  notifyLeadReassigned,
  notifyAssignmentFailed,
} from "./assignment.notifications";
import { maybeCreateFollowUpTask } from "@/server/jobs/follow-up.job";
import type { AssignLeadInput, AssignLeadResult } from "./assignment.types";

const AUTOMATIC_METHODS: Record<AssignmentStrategy, AssignmentMethod> = {
  [AssignmentStrategy.ROUND_ROBIN]: AssignmentMethod.ROUND_ROBIN,
  [AssignmentStrategy.LEAST_ASSIGNED]: AssignmentMethod.LEAST_ASSIGNED,
  [AssignmentStrategy.WEIGHTED_ROUND_ROBIN]: AssignmentMethod.WEIGHTED_ROUND_ROBIN,
  [AssignmentStrategy.MANUAL]: AssignmentMethod.MANUAL,
};

/**
 * Orchestrates lead assignment end-to-end. See docs/lead-distribution.md for
 * the behavioral contract. Concurrency safety summary:
 *
 * 1. The whole decision + write path runs in one Serializable transaction.
 * 2. The Lead row is locked FOR UPDATE first, so concurrent assignment
 *    attempts on the same lead (e.g. duplicate webhook delivery racing a
 *    manual assign) serialize instead of both succeeding.
 * 3. If the lead is already ASSIGNED and this is an AUTO trigger, the
 *    transaction short-circuits and returns the existing assignment
 *    (idempotent — a lead is never assigned twice by automatic dispatch).
 * 4. The AssignmentState row for the target team+strategy is locked FOR
 *    UPDATE before reading roundRobinIndex/lastAssignedUserId, so concurrent
 *    round-robin computations for the same team cannot both read the same
 *    pointer and pick the same person.
 * 5. All writes (lead fields, LeadAssignment, AssignmentHistory,
 *    AssignmentState, LeadActivity, AuditLog) happen in the same
 *    transaction — all or nothing.
 * 6. Notifications fire after commit; failures there are logged, never
 *    rolled back into the assignment.
 * 7. If no eligible member exists, the lead is still fully processed as
 *    UNASSIGNED/REASSIGNMENT_REQUIRED with a recorded reason — it is never
 *    silently dropped.
 */
const MAX_SERIALIZATION_RETRIES = 10;
const POSTGRES_SERIALIZATION_FAILURE = "40001";
const POSTGRES_DEADLOCK_DETECTED = "40P01";

function isRetryableTransactionError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const driverError = (
    error.meta as
      | { driverAdapterError?: { cause?: { originalCode?: string; kind?: string } } }
      | undefined
  )?.driverAdapterError?.cause;
  if (driverError?.kind === "TransactionWriteConflict") return true;
  const pgCode = driverError?.originalCode;
  return pgCode === POSTGRES_SERIALIZATION_FAILURE || pgCode === POSTGRES_DEADLOCK_DETECTED;
}

async function runAssignmentTransaction(
  input: AssignLeadInput
): Promise<AssignLeadResult & { previousUserId?: string }> {
  return prisma.$transaction(
    async (tx) => {
      const lockedLead = await repo.lockLeadForUpdate(tx, input.leadId);
      if (!lockedLead) {
        throw new NotFoundError("Lead not found");
      }

      const lead = await tx.lead.findUniqueOrThrow({ where: { id: input.leadId } });

      if (
        input.trigger === "AUTO" &&
        lockedLead.assignment_status === "ASSIGNED"
      ) {
        return {
          status: "ALREADY_ASSIGNED" as const,
          leadId: lead.id,
          assignedUserId: lead.assignedUserId ?? undefined,
          teamId: lead.assignedTeamId ?? undefined,
        };
      }

      if (input.trigger === "MANUAL") {
        return handleManualAssignment(tx, input, lead);
      }

      return handleAutomaticAssignment(tx, input, lead);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }
  );
}

/**
 * Serializable transactions can be aborted by Postgres with a "could not
 * serialize access due to concurrent update" error when two transactions
 * genuinely conflict (e.g. two concurrent automatic assignments for the same
 * team's round-robin pointer). This is Postgres correctly preventing a race,
 * not a bug — the caller is expected to retry. We do so here with a small
 * bounded number of attempts and jittered backoff so callers (webhook
 * handlers, sync jobs, API routes) don't each need to implement this.
 */
export async function assignLead(input: AssignLeadInput): Promise<AssignLeadResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_SERIALIZATION_RETRIES; attempt++) {
    try {
      const result = await runAssignmentTransaction(input);
      await dispatchPostCommitEffects(result, input);
      return result;
    } catch (error) {
      if (!isRetryableTransactionError(error)) {
        throw error;
      }
      lastError = error;
      const backoffMs = Math.min(25 * 2 ** attempt, 800) + Math.random() * 25;
      logger.warn(
        { leadId: input.leadId, attempt, backoffMs },
        "Assignment transaction hit a serialization conflict, retrying"
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  logger.error({ leadId: input.leadId, err: lastError }, "Assignment failed after max retries");
  throw lastError;
}

async function handleManualAssignment(
  tx: Prisma.TransactionClient,
  input: AssignLeadInput,
  lead: { id: string; organizationId: string; assignedUserId: string | null; assignedTeamId: string | null }
): Promise<AssignLeadResult> {
  if (!input.targetUserId) {
    throw new ValidationError("targetUserId is required for manual assignment");
  }

  const targetUser = await tx.user.findFirst({
    where: { id: input.targetUserId, organizationId: input.organizationId },
  });
  if (!targetUser) {
    throw new ValidationError("Target user does not belong to this organization");
  }

  const teamId = input.targetTeamId ?? lead.assignedTeamId ?? null;

  await repo.assignLeadFields(tx, lead.id, {
    assignedUserId: targetUser.id,
    assignedTeamId: teamId,
    assignmentStatus: "ASSIGNED",
    assignmentMethod: AssignmentMethod.MANUAL,
  });

  await repo.createLeadAssignment(tx, {
    organizationId: input.organizationId,
    leadId: lead.id,
    assignedUserId: targetUser.id,
    teamId,
    assignmentMethod: AssignmentMethod.MANUAL,
    assignmentReason: input.reason ?? null,
  });

  await repo.createAssignmentHistory(tx, {
    organizationId: input.organizationId,
    leadId: lead.id,
    previousUserId: lead.assignedUserId,
    newUserId: targetUser.id,
    previousTeamId: lead.assignedTeamId,
    newTeamId: teamId,
    changedByUserId: input.triggeredByUserId ?? null,
    assignmentMethod: AssignmentMethod.MANUAL,
    reason: input.reason ?? null,
  });

  await repo.createLeadActivity(tx, {
    organizationId: input.organizationId,
    leadId: lead.id,
    userId: input.triggeredByUserId ?? null,
    activityType: lead.assignedUserId ? "REASSIGNED" : "ASSIGNED",
    metadata: { method: "MANUAL", targetUserId: targetUser.id, reason: input.reason ?? null },
  });

  await repo.createAuditLog(tx, {
    organizationId: input.organizationId,
    userId: input.triggeredByUserId ?? null,
    action: lead.assignedUserId ? "LEAD_REASSIGNED" : "LEAD_ASSIGNED",
    entityType: "Lead",
    entityId: lead.id,
    metadata: { method: "MANUAL", targetUserId: targetUser.id },
  });

  return {
    status: "ASSIGNED",
    leadId: lead.id,
    assignedUserId: targetUser.id,
    teamId: teamId ?? undefined,
    method: AssignmentMethod.MANUAL,
    reason: input.reason,
    previousUserId: lead.assignedUserId ?? undefined,
  } as AssignLeadResult & { previousUserId?: string };
}

async function handleAutomaticAssignment(
  tx: Prisma.TransactionClient,
  input: AssignLeadInput,
  lead: {
    id: string;
    organizationId: string;
    assignedTeamId: string | null;
    source: string;
    metaPageId: string | null;
    metaFormId: string | null;
    metaCampaignId: string | null;
    metaAdSetId: string | null;
    metaAdId: string | null;
  }
): Promise<AssignLeadResult> {
  const settings = await getOrCreateSettings(input.organizationId);

  if (!settings.automaticAssignmentEnabled) {
    return markUnassigned(tx, input, lead.id, "Automatic assignment is disabled for this organization");
  }

  const { resolveAssignmentRule } = await import("./assignment.rules");
  const routing = await resolveAssignmentRule(tx, input.organizationId, {
    source: lead.source as never,
    metaPageId: lead.metaPageId,
    metaFormId: lead.metaFormId,
    metaCampaignId: lead.metaCampaignId,
    metaAdSetId: lead.metaAdSetId,
    metaAdId: lead.metaAdId,
  });

  const teamId = routing?.teamId ?? settings.defaultTeamId ?? input.targetTeamId ?? null;
  const strategy = routing?.strategy ?? settings.defaultStrategy;
  const ruleId = routing?.ruleId ?? null;

  if (!teamId) {
    return markUnassigned(tx, input, lead.id, "No default or matching sales team is configured");
  }

  const team = await tx.salesTeam.findFirst({ where: { id: teamId, organizationId: input.organizationId } });
  if (!team || !team.isActive) {
    return markUnassigned(tx, input, lead.id, "Target sales team is inactive or does not exist");
  }

  const eligibleMembers = await getEligibleMembers(tx, input.organizationId, teamId, {
    enforceCapacity: settings.enforceCapacity,
  });

  if (eligibleMembers.length === 0) {
    return markUnassigned(
      tx,
      input,
      lead.id,
      "No eligible salesperson is available (all are inactive, paused, or at capacity)",
      teamId
    );
  }

  const state = await repo.lockOrCreateAssignmentState(tx, input.organizationId, teamId, strategy);

  const selection =
    strategy === AssignmentStrategy.LEAST_ASSIGNED
      ? leastAssigned(eligibleMembers)
      : strategy === AssignmentStrategy.WEIGHTED_ROUND_ROBIN
        ? weightedRoundRobin(eligibleMembers, state)
        : roundRobin(eligibleMembers, state);

  await repo.updateAssignmentState(tx, state.id, {
    roundRobinIndex: selection.nextRoundRobinIndex,
    lastAssignedUserId: selection.nextLastAssignedUserId,
  });

  const method = AUTOMATIC_METHODS[strategy];

  await repo.assignLeadFields(tx, lead.id, {
    assignedUserId: selection.userId,
    assignedTeamId: teamId,
    assignmentStatus: "ASSIGNED",
    assignmentMethod: method,
  });

  await repo.createLeadAssignment(tx, {
    organizationId: input.organizationId,
    leadId: lead.id,
    assignedUserId: selection.userId,
    teamId,
    assignmentMethod: method,
    assignmentRuleId: ruleId,
    assignmentReason: ruleId ? `Matched assignment rule` : `Default strategy: ${strategy}`,
  });

  await repo.createAssignmentHistory(tx, {
    organizationId: input.organizationId,
    leadId: lead.id,
    newUserId: selection.userId,
    newTeamId: teamId,
    assignmentMethod: method,
    assignmentRuleId: ruleId,
    reason: "Automatic assignment",
  });

  await repo.createLeadActivity(tx, {
    organizationId: input.organizationId,
    leadId: lead.id,
    activityType: "ASSIGNED",
    metadata: { method, strategy, ruleId, teamId },
  });

  await repo.createAuditLog(tx, {
    organizationId: input.organizationId,
    action: "LEAD_AUTO_ASSIGNED",
    entityType: "Lead",
    entityId: lead.id,
    metadata: { method, strategy, ruleId, teamId, selectedUserId: selection.userId, eligibleCount: eligibleMembers.length },
  });

  await repo.touchMemberLastAssigned(tx, input.organizationId, teamId, selection.userId);

  return {
    status: "ASSIGNED",
    leadId: lead.id,
    assignedUserId: selection.userId,
    teamId,
    method,
    strategy,
    ruleId: ruleId ?? undefined,
  };
}

async function markUnassigned(
  tx: Prisma.TransactionClient,
  input: AssignLeadInput,
  leadId: string,
  reason: string,
  teamId?: string
): Promise<AssignLeadResult> {
  await repo.assignLeadFields(tx, leadId, {
    assignedUserId: null,
    assignedTeamId: teamId ?? null,
    assignmentStatus: input.trigger === "RETRY" ? "REASSIGNMENT_REQUIRED" : "UNASSIGNED",
    assignmentMethod: null,
  });

  await repo.createLeadActivity(tx, {
    organizationId: input.organizationId,
    leadId,
    activityType: "ASSIGNMENT_FAILED",
    metadata: { reason, teamId: teamId ?? null },
  });

  await repo.createAuditLog(tx, {
    organizationId: input.organizationId,
    action: "LEAD_ASSIGNMENT_FAILED",
    entityType: "Lead",
    entityId: leadId,
    metadata: { reason, teamId: teamId ?? null },
  });

  logger.warn({ leadId, organizationId: input.organizationId, reason }, "Lead left unassigned");

  return { status: "UNASSIGNED", leadId, reason };
}

async function dispatchPostCommitEffects(result: AssignLeadResult, input: AssignLeadInput) {
  try {
    if (result.status === "ASSIGNED" && result.assignedUserId) {
      const followUp = await maybeCreateFollowUpTask({
        organizationId: input.organizationId,
        leadId: result.leadId,
        assignedUserId: result.assignedUserId,
      });

      if (input.trigger === "MANUAL") {
        const previousUserId = (result as AssignLeadResult & { previousUserId?: string }).previousUserId;
        if (previousUserId) {
          await notifyLeadReassigned({
            organizationId: input.organizationId,
            leadId: result.leadId,
            newUserId: result.assignedUserId,
            previousUserId,
          });
        } else {
          await notifyLeadAssigned({
            organizationId: input.organizationId,
            leadId: result.leadId,
            assignedUserId: result.assignedUserId,
            isManual: true,
            followUpDueAt: followUp?.dueDate ?? null,
          });
        }
      } else {
        await notifyLeadAssigned({
          organizationId: input.organizationId,
          leadId: result.leadId,
          assignedUserId: result.assignedUserId,
          isManual: false,
          followUpDueAt: followUp?.dueDate ?? null,
        });
      }
    } else if (result.status === "UNASSIGNED") {
      await notifyAssignmentFailed({
        organizationId: input.organizationId,
        leadId: result.leadId,
        reason: result.reason ?? "No eligible salesperson available",
      });
    }
  } catch (error) {
    logger.error({ err: error, leadId: result.leadId }, "Post-assignment notification/follow-up failed");
  }
}
