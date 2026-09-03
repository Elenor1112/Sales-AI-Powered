/**
 * Tenant isolation contract for this codebase: every repository function
 * takes `organizationId` as a required first parameter and includes it in
 * every Prisma `where` clause. There is no code path that queries org-scoped
 * tables without it. Route handlers obtain organizationId exclusively from
 * the authenticated session (src/server/auth/guards.ts), never from request
 * input, so a caller cannot supply a different organization's id.
 */
export type { RequestSession } from "@/server/auth/session";
