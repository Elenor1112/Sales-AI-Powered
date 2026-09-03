import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { verifySubscription, verifySignature, processWebhookPayload } from "@/server/integrations/meta/webhooks";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (verifySubscription(mode, token)) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature)) {
    logger.warn("Meta webhook signature verification failed");
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // Always acknowledge with 200 once signature-verified, even if internal
  // processing fails, so Meta does not retry indefinitely for a permanent
  // bug (spec §16/§30). Failures are recorded on MetaWebhookEvent and
  // surfaced via admin notification instead.
  try {
    await processWebhookPayload(payload as never);
  } catch (error) {
    logger.error({ err: error }, "Unhandled error processing Meta webhook payload");
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
