import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TaskQueryInput } from "@/server/validation/task.schema";
import { paginationToSkipTake } from "@/lib/pagination";

export function buildTaskWhere(organizationId: string, query: TaskQueryInput): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { organizationId };
  if (query.status) where.status = query.status;
  if (query.assignedUserId) where.assignedUserId = query.assignedUserId;
  if (query.leadId) where.leadId = query.leadId;
  if (query.dealId) where.dealId = query.dealId;
  if (query.overdue) {
    where.dueDate = { lt: new Date() };
    where.status = { notIn: ["COMPLETED", "CANCELLED"] };
  }
  return where;
}

export async function findManyTasks(organizationId: string, query: TaskQueryInput) {
  const where = buildTaskWhere(organizationId, query);
  const { skip, take } = paginationToSkipTake(query);

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        assignedUser: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return { items, total };
}

export function findTaskById(organizationId: string, taskId: string) {
  return prisma.task.findFirst({ where: { id: taskId, organizationId } });
}

export function createTask(organizationId: string, data: Prisma.TaskUncheckedCreateInput) {
  return prisma.task.create({ data: { ...data, organizationId } });
}

export function updateTask(organizationId: string, taskId: string, data: Prisma.TaskUncheckedUpdateInput) {
  return prisma.task.update({ where: { id: taskId, organizationId }, data });
}
