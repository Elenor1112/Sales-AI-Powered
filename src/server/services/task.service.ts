import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import * as taskRepo from "@/server/repositories/task.repository";
import type { CreateTaskInput, TaskQueryInput, UpdateTaskInput } from "@/server/validation/task.schema";

export function listTasks(organizationId: string, query: TaskQueryInput) {
  return taskRepo.findManyTasks(organizationId, query);
}

export async function getTask(organizationId: string, taskId: string) {
  const task = await taskRepo.findTaskById(organizationId, taskId);
  if (!task) throw new NotFoundError("Task not found");
  return task;
}

export async function createTask(organizationId: string, createdByUserId: string, input: CreateTaskInput) {
  const assignee = await prisma.user.findFirst({ where: { id: input.assignedUserId, organizationId } });
  if (!assignee) throw new ValidationError("assignedUserId must reference a user in this organization");

  const task = await taskRepo.createTask(organizationId, {
    organizationId,
    leadId: input.leadId,
    dealId: input.dealId,
    assignedUserId: input.assignedUserId,
    createdByUserId,
    title: input.title,
    description: input.description,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    priority: input.priority ?? "MEDIUM",
  });

  if (input.leadId) {
    await prisma.leadActivity.create({
      data: {
        organizationId,
        leadId: input.leadId,
        userId: createdByUserId,
        activityType: "TASK_CREATED",
        metadata: { taskId: task.id, title: task.title },
      },
    });
  }

  return task;
}

export async function updateTask(organizationId: string, taskId: string, input: UpdateTaskInput) {
  await getTask(organizationId, taskId);
  return taskRepo.updateTask(organizationId, taskId, {
    ...input,
    dueDate: input.dueDate === undefined ? undefined : input.dueDate ? new Date(input.dueDate) : null,
  });
}

export async function completeTask(organizationId: string, taskId: string, userId: string) {
  const task = await getTask(organizationId, taskId);

  const updated = await taskRepo.updateTask(organizationId, taskId, {
    status: "COMPLETED",
    completedAt: new Date(),
  });

  if (task.leadId) {
    await prisma.leadActivity.create({
      data: {
        organizationId,
        leadId: task.leadId,
        userId,
        activityType: "TASK_COMPLETED",
        metadata: { taskId },
      },
    });
  }

  return updated;
}

export function findOverdueTasks(organizationId: string) {
  return prisma.task.findMany({
    where: {
      organizationId,
      dueDate: { lt: new Date() },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    include: { assignedUser: { select: { id: true, name: true } } },
  });
}
