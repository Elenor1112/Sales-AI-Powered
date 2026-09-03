import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma CLI operations (migrate, studio, db push) use the direct/unpooled
// Neon connection. The application runtime (src/lib/prisma.ts) reads
// DATABASE_URL directly and can point at Neon's pooled connection string.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
