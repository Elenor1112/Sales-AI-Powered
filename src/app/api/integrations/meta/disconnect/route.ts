import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(
  async (_req, { organizationId }) => {
    try {
      const connection = await prisma.metaConnection.findUnique({ where: { organizationId } });
      if (!connection) {
        throw new NotFoundError("No Meta connection found for this organization");
      }

      // Historical leads are preserved; only the connection itself is
      // deactivated (spec §13: connection status tracking).
      await prisma.metaConnection.update({
        where: { organizationId },
        data: { status: "DISCONNECTED", accessTokenEncrypted: null },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN] }
);
