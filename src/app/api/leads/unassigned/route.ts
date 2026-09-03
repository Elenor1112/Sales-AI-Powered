import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { listUnassignedLeads } from "@/server/services/unassigned-lead.service";

export const GET = withAuth(async (_req, { organizationId }) => {
  const leads = await listUnassignedLeads(organizationId);
  return NextResponse.json({ leads });
});
