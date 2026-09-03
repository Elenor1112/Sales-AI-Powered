import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function findManyRules(organizationId: string) {
  return prisma.assignmentRule.findMany({
    where: { organizationId },
    orderBy: { priority: "asc" },
    include: { team: { select: { id: true, name: true } } },
  });
}

export function findRuleById(organizationId: string, ruleId: string) {
  return prisma.assignmentRule.findFirst({ where: { id: ruleId, organizationId } });
}

export function createRule(organizationId: string, data: Prisma.AssignmentRuleUncheckedCreateInput) {
  return prisma.assignmentRule.create({ data: { ...data, organizationId } });
}

export function updateRule(organizationId: string, ruleId: string, data: Prisma.AssignmentRuleUncheckedUpdateInput) {
  return prisma.assignmentRule.update({ where: { id: ruleId, organizationId }, data });
}

export function deleteRule(organizationId: string, ruleId: string) {
  return prisma.assignmentRule.delete({ where: { id: ruleId, organizationId } });
}
