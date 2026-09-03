import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { toPaginatedResult } from "@/lib/pagination";
import { listTasks, createTask } from "@/server/services/task.service";
import { createTaskSchema, taskQuerySchema } from "@/server/validation/task.schema";

export const GET = withAuth(async (req, { organizationId, session }) => {
  try {
    const url = new URL(req.url);
    const query = taskQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));

    if (session.role === Role.SALES_REP) {
      query.assignedUserId = session.userId;
    }

    const { items, total } = await listTasks(organizationId, query);
    return NextResponse.json(toPaginatedResult(items, total, query));
  } catch (error) {
    return toErrorResponse(error);
  }
});

export const POST = withAuth(async (req, { organizationId, session }) => {
  try {
    const body = createTaskSchema.parse(await req.json());
    const task = await createTask(organizationId, session.userId, body);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
});
