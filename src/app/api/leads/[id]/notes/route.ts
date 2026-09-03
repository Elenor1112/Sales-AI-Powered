import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { addNote } from "@/server/services/lead.service";
import { addNoteSchema } from "@/server/validation/lead.schema";
import { assertLeadAccess } from "@/server/services/lead-access";
import { prisma } from "@/lib/prisma";

export const GET = withAuth<{ id: string }>(async (_req, { organizationId, params, session }) => {
  try {
    await assertLeadAccess(session, params.id);
    const notes = await prisma.note.findMany({
      where: { organizationId, leadId: params.id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ notes });
  } catch (error) {
    return toErrorResponse(error);
  }
});

export const POST = withAuth<{ id: string }>(async (req, { organizationId, params, session }) => {
  try {
    await assertLeadAccess(session, params.id);
    const body = addNoteSchema.parse(await req.json());
    const note = await addNote(organizationId, params.id, session.userId, body.content);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
});
