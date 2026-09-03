import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth } from "@/server/auth/guards";
import { toErrorResponse } from "@/lib/errors";
import { createOAuthState, buildAuthUrl } from "@/server/integrations/meta/oauth";

export const GET = withAuth(
  async (_req, { organizationId, session }) => {
    try {
      const state = createOAuthState(organizationId, session.userId);
      const authUrl = buildAuthUrl(state);
      return NextResponse.redirect(authUrl);
    } catch (error) {
      return toErrorResponse(error);
    }
  },
  { roles: [Role.ADMIN] }
);
