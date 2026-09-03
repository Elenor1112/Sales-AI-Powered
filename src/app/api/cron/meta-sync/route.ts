import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { syncConnection } from "@/server/integrations/meta/sync";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${expected}`;
}

/**
 * Backup synchronization mechanism (spec §32). Webhooks are the primary
 * real-time path; this endpoint is a scheduled fallback in case a webhook
 * event was missed. Deployment-agnostic — wire it to any scheduler (Vercel
 * Cron, a generic cron host, GitHub Actions, etc.) that can POST here with
 * the CRON_SECRET bearer token on the interval you choose (spec recommends
 * 15-30 minutes).
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const connections = await prisma.metaConnection.findMany({
    where: { status: "CONNECTED" },
  });

  const results = [];
  for (const connection of connections) {
    try {
      const result = await syncConnection(connection.id, {
        organizationId: connection.organizationId,
        mode: "backup",
      });
      results.push({ organizationId: connection.organizationId, ...result });
    } catch (error) {
      logger.error(
        { err: error, organizationId: connection.organizationId },
        "Backup Meta sync failed for connection"
      );
      results.push({ organizationId: connection.organizationId, error: (error as Error).message });
    }
  }

  return NextResponse.json({ syncedConnections: connections.length, results });
}
