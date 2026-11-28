/**
 * Resolves the Postgres connection string.
 * Production (AWS RDS) sets RDS_DATABASE_URL; local development uses DATABASE_URL.
 *
 * - RDS requires SSL, so sslmode=require is added for RDS hosts unless the URL
 *   already specifies an sslmode.
 * - Prisma-style options such as `?schema=public` are removed: the postgres
 *   driver would send them to the server as settings, and Postgres rejects the
 *   whole connection ("unrecognized configuration parameter").
 */
const PRISMA_ONLY = ["schema", "connection_limit", "pool_timeout", "pgbouncer", "socket_timeout", "statement_cache_size", "sslaccept"];

export function normalizeDatabaseUrl(raw: string): string {
  const url = new URL(raw.trim());
  for (const k of PRISMA_ONLY) url.searchParams.delete(k);
  if (url.hostname.endsWith(".rds.amazonaws.com") && !url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  return url.toString();
}

export function databaseUrl(): string {
  const raw = process.env.RDS_DATABASE_URL || process.env.DATABASE_URL;
  if (!raw) throw new Error("Set RDS_DATABASE_URL (production) or DATABASE_URL (local).");
  return normalizeDatabaseUrl(raw);
}
