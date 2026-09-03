import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { addTags } from "@/server/services/lead.service";
import { addTagsSchema } from "@/server/validation/lead.schema";
import { assertLeadAccess } from "@/server/services/lead-access";

export const POST = withAuth<{ id: string }>(async (req, { organizationId, params, session }) => {
  try {
    await assertLeadAccess(session, params.id);
    const body = addTagsSchema.parse(await req.json());
    const tags = await addTags(organizationId, params.id, session.userId, body);
    return NextResponse.json({ tags }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
});
