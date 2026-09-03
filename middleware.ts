import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

// This is a UX convenience only. Real authorization is enforced server-side
// in every route handler via src/server/auth/guards.ts — see docs/api.md.
export default auth((req: NextRequest & { auth: unknown }) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith("/sales") || pathname.startsWith("/settings");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/sales/:path*", "/settings/:path*"],
};
