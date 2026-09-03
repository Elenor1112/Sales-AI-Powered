import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";

export interface RequestSession {
  userId: string;
  organizationId: string;
  role: Role;
  name: string | null;
  email: string;
}

export async function getRequestSession(): Promise<RequestSession | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role,
    name: session.user.name ?? null,
    email: session.user.email ?? "",
  };
}

export async function requireSession(): Promise<RequestSession> {
  const session = await getRequestSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}
