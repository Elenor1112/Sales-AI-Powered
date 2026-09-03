import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { getTask, updateTask } from "@/server/services/task.service";
import { updateTaskSchema } from "@/server/validation/task.schema";

export const GET = withAuth<{ id: string }>(async (_req, { organizationId, params }) => {
  try {
    const task = await getTask(organizationId, params.id);
    return NextResponse.json({ task });
  } catch (error) {
    return toErrorResponse(error);
  }
});

export const PATCH = withAuth<{ id: string }>(async (req, { organizationId, params }) => {
  try {
    const body = updateTaskSchema.parse(await req.json());
    const task = await updateTask(organizationId, params.id, body);
    return NextResponse.json({ task });
  } catch (error) {
    return toErrorResponse(error);
  }
});
