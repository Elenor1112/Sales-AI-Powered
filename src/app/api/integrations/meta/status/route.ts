import { NextResponse } from "next/server";

import { withAuth } from "@/server/auth/guards";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_req, { organizationId }) => {
  const connection = await prisma.metaConnection.findUnique({
    where: { organizationId },
    include: {
      pages: { include: { forms: true } },
      syncs: { orderBy: { startedAt: "desc" }, take: 5 },
    },
  });

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  // Never return accessTokenEncrypted (page or connection level) to the client.
  return NextResponse.json({
    connected: connection.status === "CONNECTED",
    status: connection.status,
    connectedByUserId: connection.connectedByUserId,
    tokenExpiresAt: connection.tokenExpiresAt,
    lastError: connection.lastError,
    pages: connection.pages.map((page) => ({
      id: page.id,
      metaPageId: page.metaPageId,
      name: page.name,
      isSubscribed: page.isSubscribed,
      forms: page.forms.map((form) => ({
        id: form.id,
        metaFormId: form.metaFormId,
        name: form.name,
        status: form.status,
      })),
    })),
    recentSyncs: connection.syncs.map((sync) => ({
      id: sync.id,
      mode: sync.mode,
      status: sync.status,
      leadsFetched: sync.leadsFetched,
      leadsCreated: sync.leadsCreated,
      leadsAssigned: sync.leadsAssigned,
      startedAt: sync.startedAt,
      finishedAt: sync.finishedAt,
    })),
  });
});
