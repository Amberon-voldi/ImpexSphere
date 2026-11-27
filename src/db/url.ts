/**
 * Resolves the Postgres connection string.
 * Production (AWS RDS) sets RDS_DATABASE_URL; local development uses DATABASE_URL.
 * RDS requires SSL by default, so sslmode=require is added for RDS hosts
 * unless the URL already specifies an sslmode.
 */
export function databaseUrl(): string {
  const raw = process.env.RDS_DATABASE_URL || process.env.DATABASE_URL;
  if (!raw) throw new Error("Set RDS_DATABASE_URL (production) or DATABASE_URL (local).");

  const url = new URL(raw);
  if (url.hostname.endsWith(".rds.amazonaws.com") && !url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }
  return url.toString();
}
