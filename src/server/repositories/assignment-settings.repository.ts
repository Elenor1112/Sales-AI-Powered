import { prisma } from "@/lib/prisma";
import { AssignmentStrategy, FallbackBehavior, ImportAssignmentMode } from "@prisma/client";

export async function getOrCreateSettings(organizationId: string) {
  const existing = await prisma.assignmentSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;

  return prisma.assignmentSettings.create({
    data: {
      organizationId,
      automaticAssignmentEnabled: true,
      defaultStrategy: AssignmentStrategy.ROUND_ROBIN,
      enforceCapacity: true,
      notifyAssignedUser: true,
      notifyManagersOnUnassigned: true,
      fallbackBehavior: FallbackBehavior.UNASSIGNED_QUEUE,
      importAssignmentMode: ImportAssignmentMode.ASSIGN_IMPORTED_LEADS,
    },
  });
}

export function updateSettings(
  organizationId: string,
  data: Partial<{
    automaticAssignmentEnabled: boolean;
    defaultStrategy: AssignmentStrategy;
    defaultTeamId: string | null;
    enforceCapacity: boolean;
    notifyAssignedUser: boolean;
    notifyManagersOnUnassigned: boolean;
    fallbackBehavior: FallbackBehavior;
    importAssignmentMode: ImportAssignmentMode;
  }>
) {
  return prisma.assignmentSettings.update({ where: { organizationId }, data });
}
