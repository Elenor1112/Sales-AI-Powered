import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { completeTask } from "@/server/services/task.service";

export const POST = withAuth<{ id: string }>(async (_req, { organizationId, params, session }) => {
  try {
    const task = await completeTask(organizationId, params.id, session.userId);
    return NextResponse.json({ task });
  } catch (error) {
    return toErrorResponse(error);
  }
});
