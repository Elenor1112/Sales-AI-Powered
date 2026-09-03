import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { getWorkload } from "@/server/services/workload.service";

export const GET = withAuth(async (_req, { organizationId }) => {
  const workload = await getWorkload(organizationId);
  return NextResponse.json({ workload });
});
