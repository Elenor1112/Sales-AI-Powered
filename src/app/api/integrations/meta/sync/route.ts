import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { syncConnection } from "@/server/integrations/meta/sync";

export const POST = withAuth(
  async (_req, { organizationId, session }) => {
    try {
      const connection = await prisma.metaConnection.findUnique({ where: { organizationId } });
      if (!connection) {
        throw new NotFoundError("No Meta connection found for this organization");
      }

      const result = await syncConnection(connection.id, {
        organizationId,
        triggeredByUserId: session.userId,
        mode: "historical",
      });

      return NextResponse.json({ result });
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN, Role.SALES_MANAGER] }
);
