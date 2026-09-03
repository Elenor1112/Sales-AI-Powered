# Neon PostgreSQL Setup

This project uses [Neon](https://neon.tech) for its Postgres database in production. Locally, any Postgres 14+ instance works (a Docker container was used during development of this codebase).

## 1. Create a Neon project

1. Sign in to [console.neon.tech](https://console.neon.tech).
2. Create a new project (choose a region close to your deployment target).
3. Neon creates a default database and branch automatically.

## 2. Get your connection strings

Neon gives you two connection strings from the project dashboard's "Connection Details" panel:

- **Pooled connection** (uses PgBouncer, typically port `5432` with `?pgbouncer=true` or a `-pooler` hostname suffix) — used by the running application at runtime (`DATABASE_URL`).
- **Direct connection** (no pooling) — required for Prisma Migrate and for the assignment engine's `SELECT ... FOR UPDATE` row-locking transactions, which need a real session rather than a pooled statement multiplexer (`DIRECT_URL`).

## 3. Configure environment variables

```env
DATABASE_URL="postgresql://<user>:<password>@<pooled-host>/<db>?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://<user>:<password>@<direct-host>/<db>?sslmode=require"
```

Both are required — see `.env.example`. This project uses Prisma 7, which moved datasource configuration out of `schema.prisma` into `prisma.config.ts`. That file already points Prisma CLI operations (migrate, studio) at `DIRECT_URL`; the application code (`src/lib/prisma.ts`) constructs its own `PrismaClient` using `@prisma/adapter-pg` against `DATABASE_URL` at runtime.

## 4. Run migrations

```bash
npx prisma generate
npx prisma migrate deploy   # production — applies existing migrations only
# or, in development:
npx prisma migrate dev      # creates + applies new migrations from schema changes
```

## 5. Seed the database

```bash
npm run db:seed
```

This creates an example organization ("Acme Inc"), an admin, a sales manager, three sales reps, a sales team, default assignment settings (round robin), and one example (inactive) assignment rule. Credentials are printed to the console. Set `SEED_DEMO_LEADS=true` to also insert a couple of non-production demo leads — never enable this in a real deployment.

## 6. Verify connectivity

```bash
npx prisma studio
```

This opens a local GUI browsing your Neon database directly, confirming both `DATABASE_URL`/`DIRECT_URL` are correctly configured and reachable.

## Notes on the driver adapter

Prisma 7 requires an explicit driver adapter (no more implicit `DATABASE_URL` reads inside `PrismaClient`). This project uses `@prisma/adapter-pg` (the standard `pg` driver over Postgres wire protocol), which works identically against Neon's pooled or direct endpoints — no Neon-specific serverless driver is required for this deployment target, though you may swap in `@neondatabase/serverless` + `@prisma/adapter-neon` later if you deploy to an edge runtime that doesn't support raw TCP connections.
