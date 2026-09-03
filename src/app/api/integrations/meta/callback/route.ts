import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  parseAndVerifyState,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
} from "@/server/integrations/meta/oauth";
import { discoverPagesAndForms } from "@/server/integrations/meta/sync";

function redirectWithStatus(origin: string, status: "connected" | "error", message?: string) {
  const url = new URL("/settings/integrations/meta", origin);
  url.searchParams.set(status === "connected" ? "connected" : "error", message ?? "1");
  return NextResponse.redirect(url);
}

/**
 * Not wrapped in withAuth: Meta redirects the browser here directly (no
 * custom headers/cookies we control), so identity comes from the signed
 * OAuth state token itself (verified below), not from a session guard.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    return redirectWithStatus(origin, "error", "Meta authorization was denied or cancelled");
  }
  if (!code || !state) {
    return redirectWithStatus(origin, "error", "Missing code or state");
  }

  let statePayload;
  try {
    statePayload = parseAndVerifyState(state);
  } catch (error) {
    logger.warn({ err: error }, "Meta OAuth callback received invalid state");
    return redirectWithStatus(origin, "error", "Invalid or expired authorization request");
  }

  try {
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    const expiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000)
      : null;

    const connection = await prisma.metaConnection.upsert({
      where: { organizationId: statePayload.organizationId },
      update: {
        connectedByUserId: statePayload.userId,
        status: "CONNECTED",
        accessTokenEncrypted: encrypt(longLived.access_token),
        tokenExpiresAt: expiresAt,
        lastError: null,
      },
      create: {
        organizationId: statePayload.organizationId,
        connectedByUserId: statePayload.userId,
        status: "CONNECTED",
        accessTokenEncrypted: encrypt(longLived.access_token),
        tokenExpiresAt: expiresAt,
      },
    });

    await discoverPagesAndForms(connection.id, statePayload.organizationId, longLived.access_token);

    return redirectWithStatus(origin, "connected");
  } catch (error) {
    logger.error({ err: error }, "Meta OAuth callback failed");
    await prisma.metaConnection
      .updateMany({
        where: { organizationId: statePayload.organizationId },
        data: { status: "ERROR", lastError: (error as Error).message?.slice(0, 1000) },
      })
      .catch(() => undefined);
    return redirectWithStatus(origin, "error", "Failed to connect Meta account");
  }
}
