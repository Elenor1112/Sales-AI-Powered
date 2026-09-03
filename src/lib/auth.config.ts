import type { NextAuthConfig } from "next-auth";

// Edge-safe subset of the NextAuth config: no Credentials provider here since
// its authorize() callback needs Prisma + bcrypt, which cannot run in the
// Edge runtime that middleware.ts executes in. The full config (auth.ts)
// extends this with that provider for use in route handlers/server code.
export const authConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.organizationId = user.organizationId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.organizationId = token.organizationId;
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
