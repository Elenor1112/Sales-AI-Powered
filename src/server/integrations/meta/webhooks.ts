import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { decrypt } from "@/lib/crypto";
import { notifyRoles } from "@/server/notifications/dispatcher";
import { createLeadFromMeta } from "@/server/services/lead.service";
import { metaProvider } from "./provider";
import { normalizeMetaLead } from "./normalize";
import { Role } from "@prisma/client";

export function verifySubscription(mode: string | null, token: string | null): boolean {
  return mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN;
}

export function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  if (expected.length !== signatureHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

interface LeadgenChangeValue {
  leadgen_id: string;
  page_id: string;
  form_id?: string;
  created_time?: number;
}

interface WebhookEntry {
  id: string; // page id
  changes?: { field: string; value: LeadgenChangeValue }[];
}

interface WebhookPayload {
  object: string;
  entry?: WebhookEntry[];
}

function computeFingerprint(pageId: string, leadgenId: string): string {
  return crypto.createHash("sha256").update(`${pageId}:${leadgenId}`).digest("hex");
}

async function processLeadgenChange(value: LeadgenChangeValue, rawPayload: unknown) {
  const fingerprint = computeFingerprint(value.page_id, value.leadgen_id);

  let eventRow;
  try {
    eventRow = await prisma.metaWebhookEvent.create({
      data: {
        eventFingerprint: fingerprint,
        metaLeadId: value.leadgen_id,
        metaPageId: value.page_id,
        payload: rawPayload as Prisma.InputJsonValue,
        status: "RECEIVED",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      logger.info({ fingerprint }, "Duplicate webhook event ignored (already processed)");
      return;
    }
    throw error;
  }

  try {
    const page = await prisma.metaPage.findFirst({
      where: { metaPageId: value.page_id },
      include: { connection: true },
    });

    if (!page || !page.accessTokenEncrypted) {
      throw new Error(`No connected Meta page found for page_id ${value.page_id}`);
    }

    const pageAccessToken = decrypt(page.accessTokenEncrypted);
    const rawLead = await metaProvider.getLeadById(value.leadgen_id, pageAccessToken);
    const normalized = normalizeMetaLead(rawLead, { pageId: value.page_id, formId: value.form_id });

    const { lead } = await createLeadFromMeta(page.organizationId, normalized);

    await prisma.metaWebhookEvent.update({
      where: { id: eventRow.id },
      data: { organizationId: page.organizationId, processedAt: new Date(), status: "PROCESSED" },
    });

    logger.info({ leadId: lead.id, organizationId: page.organizationId }, "Meta webhook lead processed");
  } catch (error) {
    await prisma.metaWebhookEvent.update({
      where: { id: eventRow.id },
      data: { status: "FAILED", errorMessage: (error as Error).message?.slice(0, 1000) },
    });

    logger.error({ err: error, fingerprint }, "Failed to process Meta webhook lead");

    const page = await prisma.metaPage.findFirst({ where: { metaPageId: value.page_id } });
    if (page) {
      await notifyRoles(page.organizationId, [Role.ADMIN], {
        type: "META_SYNC_FAILURE",
        title: "Meta webhook lead failed to process",
        message: `A Meta lead could not be imported: ${(error as Error).message}`,
        metadata: { leadgenId: value.leadgen_id, pageId: value.page_id },
      });
    }
  }
}

/**
 * Processes a verified Meta webhook payload. Always intended to return 200
 * to Meta regardless of internal processing outcome (per spec §16) — the
 * caller (the route handler) is responsible for that; failures here are
 * captured on the MetaWebhookEvent row and surfaced via notification rather
 * than by returning a non-2xx (which would cause Meta to retry
 * indefinitely for a permanent bug).
 */
export async function processWebhookPayload(payload: WebhookPayload): Promise<void> {
  if (payload.object !== "page") return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      await processLeadgenChange(change.value, payload);
    }
  }
}

export type { WebhookPayload };
