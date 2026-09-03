import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";

import { toErrorResponse } from "@/lib/errors";
import { requireSession, type RequestSession } from "@/server/auth/session";
import { assertRole } from "@/server/auth/rbac";

export interface AuthedRouteContext<TParams = Record<string, string>> {
  session: RequestSession;
  organizationId: string;
  params: TParams;
}

type RouteHandler<TParams> = (
  req: NextRequest,
  ctx: AuthedRouteContext<TParams>
) => Promise<NextResponse> | NextResponse;

interface WithAuthOptions {
  roles?: Role[];
}

/**
 * Wraps a Next.js route handler with session resolution and optional role
 * enforcement. This is the single point every mutating/sensitive route uses
 * for server-side authorization — see src/server/context.ts for how
 * organizationId scoping is then enforced structurally in repositories.
 */
export function withAuth<TParams = Record<string, string>>(
  handler: RouteHandler<TParams>,
  options: WithAuthOptions = {}
) {
  return async (
    req: NextRequest,
    routeCtx: { params: Promise<TParams> }
  ): Promise<NextResponse> => {
    try {
      const session = await requireSession();
      if (options.roles) {
        assertRole(session, options.roles);
      }
      const params = await routeCtx.params;

      return await handler(req, {
        session,
        organizationId: session.organizationId,
        params,
      });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
