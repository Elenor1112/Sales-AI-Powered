import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { decrypt } from "@/lib/crypto";
import { createLeadFromMeta } from "@/server/services/lead.service";
import { getOrCreateSettings } from "@/server/repositories/assignment-settings.repository";
import { metaProvider } from "./provider";
import { normalizeMetaLead } from "./normalize";
import { getPages } from "./pages";
import { getForms } from "./forms";

export interface SyncResult {
  syncId: string;
  leadsFetched: number;
  leadsCreated: number;
  leadsUpdated: number;
  leadsSkipped: number;
  leadsAssigned: number;
  leadsUnassigned: number;
  errors: string[];
}

/**
 * Discovers pages/forms for a connection and stores them. Called after
 * OAuth connect, and again at the start of every sync so newly created
 * forms are picked up automatically.
 */
export async function discoverPagesAndForms(connectionId: string, organizationId: string, accessToken: string) {
  const pages = await getPages(accessToken);

  for (const page of pages) {
    const { encrypt } = await import("@/lib/crypto");
    const storedPage = await prisma.metaPage.upsert({
      where: { organizationId_metaPageId: { organizationId, metaPageId: page.id } },
      update: { name: page.name, accessTokenEncrypted: encrypt(page.access_token) },
      create: {
        organizationId,
        connectionId,
        metaPageId: page.id,
        name: page.name,
        accessTokenEncrypted: encrypt(page.access_token),
      },
    });

    const forms = await getForms(page.id, page.access_token);
    for (const form of forms) {
      await prisma.metaForm.upsert({
        where: { organizationId_metaFormId: { organizationId, metaFormId: form.id } },
        update: { name: form.name, status: form.status },
        create: {
          organizationId,
          pageId: storedPage.id,
          metaFormId: form.id,
          name: form.name,
          status: form.status,
        },
      });
    }
  }
}

/**
 * Syncs leads for every connected+subscribed form under a connection.
 * Paginated (follows Graph API `after` cursors), retryable (client.ts
 * handles bounded retry/backoff per request), idempotent (createLeadFromMeta
 * relies on the (organizationId, metaLeadId) unique constraint), and
 * assignment-aware per AssignmentSettings.importAssignmentMode (spec §15).
 */
export async function syncConnection(
  connectionId: string,
  options: { organizationId: string; triggeredByUserId?: string; mode: "historical" | "backup" }
): Promise<SyncResult> {
  const connection = await prisma.metaConnection.findFirst({
    where: { id: connectionId, organizationId: options.organizationId },
  });
  if (!connection || !connection.accessTokenEncrypted) {
    throw new Error("Meta connection not found or missing access token");
  }

  const syncRow = await prisma.metaSync.create({
    data: {
      organizationId: options.organizationId,
      connectionId,
      triggeredByUserId: options.triggeredByUserId,
      mode: options.mode,
      status: "RUNNING",
    },
  });

  const result: SyncResult = {
    syncId: syncRow.id,
    leadsFetched: 0,
    leadsCreated: 0,
    leadsUpdated: 0,
    leadsSkipped: 0,
    leadsAssigned: 0,
    leadsUnassigned: 0,
    errors: [],
  };

  try {
    const accessToken = decrypt(connection.accessTokenEncrypted);
    await discoverPagesAndForms(connectionId, options.organizationId, accessToken);

    const settings = await getOrCreateSettings(options.organizationId);
    const skipAssignment = settings.importAssignmentMode === "DO_NOT_ASSIGN_IMPORTED_LEADS";

    const forms = await prisma.metaForm.findMany({
      where: { organizationId: options.organizationId },
      include: { page: true },
    });

    for (const form of forms) {
      if (!form.page.accessTokenEncrypted) continue;
      const pageAccessToken = decrypt(form.page.accessTokenEncrypted);

      let after: string | undefined;
      do {
        let page;
        try {
          page = await metaProvider.getLeads(form.metaFormId, pageAccessToken, { after });
        } catch (error) {
          result.errors.push(`Form ${form.metaFormId}: ${(error as Error).message}`);
          logger.error({ err: error, formId: form.metaFormId }, "Failed to fetch leads for form during sync");
          break;
        }

        for (const rawLead of page.data) {
          result.leadsFetched += 1;
          try {
            const normalized = normalizeMetaLead(rawLead, {
              pageId: form.page.metaPageId,
              formId: form.metaFormId,
            });
            const { wasCreated, wasAssigned } = await createLeadFromMeta(
              options.organizationId,
              normalized,
              { skipAssignment }
            );
            if (wasCreated) {
              result.leadsCreated += 1;
              if (wasAssigned) result.leadsAssigned += 1;
              else if (!skipAssignment) result.leadsUnassigned += 1;
            } else {
              result.leadsSkipped += 1;
            }
          } catch (error) {
            result.errors.push(`Lead ${rawLead.id}: ${(error as Error).message}`);
            logger.error({ err: error, leadId: rawLead.id }, "Failed to import Meta lead during sync");
          }
        }

        after = page.paging?.cursors?.after && page.paging?.next ? page.paging.cursors.after : undefined;
      } while (after);
    }

    await prisma.metaSync.update({
      where: { id: syncRow.id },
      data: {
        status: result.errors.length > 0 ? "PARTIAL" : "SUCCESS",
        leadsFetched: result.leadsFetched,
        leadsCreated: result.leadsCreated,
        leadsUpdated: result.leadsUpdated,
        leadsSkipped: result.leadsSkipped,
        leadsAssigned: result.leadsAssigned,
        leadsUnassigned: result.leadsUnassigned,
        errorMessage: result.errors.length > 0 ? result.errors.join("; ").slice(0, 2000) : null,
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.metaSync.update({
      where: { id: syncRow.id },
      data: {
        status: "FAILED",
        errorMessage: (error as Error).message?.slice(0, 2000),
        finishedAt: new Date(),
      },
    });
    throw error;
  }

  return result;
}
