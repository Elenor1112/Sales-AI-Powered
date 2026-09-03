import { NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { paginationSchema, paginationToSkipTake, toPaginatedResult } from "@/lib/pagination";

const querySchema = paginationSchema.extend({
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const GET = withAuth(async (req, { session }) => {
  try {
    const url = new URL(req.url);
    const query = querySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const { skip, take } = paginationToSkipTake(query);

    const where = {
      userId: session.userId,
      organizationId: session.organizationId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json(toPaginatedResult(items, total, query));
  } catch (error) {
    return toErrorResponse(error);
  }
});
