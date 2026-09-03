import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import * as leadRepo from "@/server/repositories/lead.repository";
import { assignLead } from "@/server/assignment/assignment.service";
import { getOrCreateSettings } from "@/server/repositories/assignment-settings.repository";
import type { NormalizedMetaLead } from "@/server/integrations/meta/types";
import type {
  ChangeStatusInput,
  CreateLeadInput,
  LeadQueryInput,
  UpdateLeadInput,
} from "@/server/validation/lead.schema";

const STATUS_TIMESTAMP_FIELD: Record<string, string | undefined> = {
  CONTACTED: "contactedAt",
  QUALIFIED: "qualifiedAt",
  PROPOSAL: "proposalAt",
  WON: "wonAt",
  LOST: "lostAt",
};

export function listLeads(organizationId: string, query: LeadQueryInput) {
  return leadRepo.findManyLeads(organizationId, query);
}

export async function getLead(organizationId: string, leadId: string) {
  const lead = await leadRepo.findLeadById(organizationId, leadId);
  if (!lead) throw new NotFoundError("Lead not found");
  return lead;
}

/**
 * Manual/API lead creation path. Runs the same duplicate-detection +
 * automatic-assignment flow as Meta ingestion (see createLeadFromMeta),
 * except duplicates here are a soft heuristic (email/phone) rather than a
 * hard unique constraint, per spec §18 — so we surface a conflict rather
 * than silently merging.
 */
export async function createLead(
  organizationId: string,
  createdByUserId: string,
  input: CreateLeadInput
) {
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;

  if (email || phone) {
    const duplicate = await leadRepo.findPossibleDuplicate(organizationId, { email, phone });
    if (duplicate) {
      throw new ConflictError("A lead with this email or phone already exists", {
        existingLeadId: duplicate.id,
      });
    }
  }

  const lead = await leadRepo.createLead(organizationId, {
    organizationId,
    name: input.name,
    firstName: input.firstName,
    lastName: input.lastName,
    email,
    phone,
    company: input.company,
    jobTitle: input.jobTitle,
    source: input.source ?? "MANUAL",
    priority: input.priority ?? "MEDIUM",
    estimatedValue: input.estimatedValue,
    currency: input.currency,
    customFields: input.customFields as Prisma.InputJsonValue | undefined,
  });

  await prisma.leadActivity.create({
    data: {
      organizationId,
      leadId: lead.id,
      userId: createdByUserId,
      activityType: "CREATED",
      metadata: { source: lead.source },
    },
  });

  const settings = await getOrCreateSettings(organizationId);
  if (settings.automaticAssignmentEnabled) {
    await assignLead({ leadId: lead.id, organizationId, trigger: "AUTO" });
  }

  return leadRepo.findLeadById(organizationId, lead.id);
}

export interface CreateLeadFromMetaResult {
  lead: Prisma.LeadGetPayload<Record<string, never>>;
  wasCreated: boolean;
  wasAssigned: boolean;
}

/**
 * Entry point for both the Meta webhook handler and MetaLeadSyncService.
 * Idempotent: the (organizationId, metaLeadId) unique constraint on Lead is
 * the hard backstop — on a Prisma P2002 conflict we fetch and return the
 * existing lead instead of creating a duplicate or re-running assignment
 * (spec §16/§18: no duplicate leads, no duplicate assignments, no duplicate
 * notifications on redelivery).
 */
export async function createLeadFromMeta(
  organizationId: string,
  normalized: NormalizedMetaLead,
  options: { skipAssignment?: boolean } = {}
): Promise<CreateLeadFromMetaResult> {
  let lead;
  let wasCreated = true;

  try {
    lead = await prisma.lead.create({
      data: {
        organizationId,
        name: normalized.name,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        email: normalized.email,
        phone: normalized.phone,
        company: normalized.company,
        jobTitle: normalized.jobTitle,
        source: "META",
        metaLeadId: normalized.metaLeadId,
        metaPageId: normalized.metaPageId,
        metaFormId: normalized.metaFormId,
        metaCampaignId: normalized.metaCampaignId,
        metaAdSetId: normalized.metaAdSetId,
        metaAdId: normalized.metaAdId,
        customFields: normalized.customFields as unknown as Prisma.InputJsonValue,
        rawSourcePayload: { field_data: normalized.rawFieldData } as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.lead.findUnique({
        where: { organizationId_metaLeadId: { organizationId, metaLeadId: normalized.metaLeadId } },
      });
      if (!existing) throw error;
      return { lead: existing, wasCreated: false, wasAssigned: existing.assignmentStatus === "ASSIGNED" };
    }
    throw error;
  }

  await prisma.leadActivity.create({
    data: {
      organizationId,
      leadId: lead.id,
      activityType: "IMPORTED",
      metadata: { source: "META", metaLeadId: normalized.metaLeadId },
    },
  });

  let wasAssigned = false;
  if (!options.skipAssignment) {
    const settings = await getOrCreateSettings(organizationId);
    if (settings.automaticAssignmentEnabled) {
      const result = await assignLead({ leadId: lead.id, organizationId, trigger: "AUTO" });
      wasAssigned = result.status === "ASSIGNED";
    }
  }

  return { lead, wasCreated, wasAssigned };
}

export async function updateLead(organizationId: string, leadId: string, input: UpdateLeadInput) {
  await getLead(organizationId, leadId);
  return leadRepo.updateLead(organizationId, leadId, input as Prisma.LeadUncheckedUpdateInput);
}

export async function deleteLead(organizationId: string, leadId: string) {
  await getLead(organizationId, leadId);
  return leadRepo.deleteLead(organizationId, leadId);
}

export async function changeStatus(
  organizationId: string,
  leadId: string,
  userId: string,
  input: ChangeStatusInput
) {
  const lead = await getLead(organizationId, leadId);

  if (input.status === "LOST" && !input.lostReason) {
    throw new ValidationError("lostReason is required when marking a lead as LOST");
  }

  const timestampField = STATUS_TIMESTAMP_FIELD[input.status];

  const updated = await prisma.lead.update({
    where: { id: leadId, organizationId },
    data: {
      status: input.status,
      lostReason: input.status === "LOST" ? input.lostReason : lead.lostReason,
      ...(timestampField ? { [timestampField]: new Date() } : {}),
    },
  });

  await prisma.leadActivity.create({
    data: {
      organizationId,
      leadId,
      userId,
      activityType: "STATUS_CHANGED",
      metadata: { oldStatus: lead.status, newStatus: input.status, lostReason: input.lostReason ?? null },
    },
  });

  return updated;
}

export async function addNote(organizationId: string, leadId: string, userId: string, content: string) {
  await getLead(organizationId, leadId);

  const note = await prisma.note.create({
    data: { organizationId, leadId, userId, content },
  });

  await prisma.leadActivity.create({
    data: { organizationId, leadId, userId, activityType: "NOTE_ADDED", metadata: { noteId: note.id } },
  });

  return note;
}

export async function addTags(
  organizationId: string,
  leadId: string,
  userId: string,
  input: { tagIds?: string[]; tagNames?: string[] }
) {
  await getLead(organizationId, leadId);

  const tagIds = [...(input.tagIds ?? [])];

  for (const name of input.tagNames ?? []) {
    const tag = await prisma.tag.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: {},
      create: { organizationId, name },
    });
    tagIds.push(tag.id);
  }

  await Promise.all(
    tagIds.map((tagId) =>
      prisma.leadTag.upsert({
        where: { leadId_tagId: { leadId, tagId } },
        update: {},
        create: { leadId, tagId },
      })
    )
  );

  await prisma.leadActivity.create({
    data: { organizationId, leadId, userId, activityType: "TAG_ADDED", metadata: { tagIds } },
  });

  return prisma.leadTag.findMany({ where: { leadId }, include: { tag: true } });
}

export function getActivities(organizationId: string, leadId: string) {
  return leadRepo.findActivities(organizationId, leadId);
}

export function getAssignmentHistory(organizationId: string, leadId: string) {
  return leadRepo.findAssignmentHistory(organizationId, leadId);
}
