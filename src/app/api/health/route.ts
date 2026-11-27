import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import postgres from "postgres";
import { databaseUrl } from "@/db/url";
import { getMigrationStatus } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * Deployment check: is the database configured and reachable, and are all
 * migrations applied? Never returns the connection string or credentials.
 */
export async function GET() {
  const env = {
    RDS_DATABASE_URL: !!process.env.RDS_DATABASE_URL,
    DATABASE_URL: !!process.env.DATABASE_URL,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    ADMIN_EMAILS: !!process.env.ADMIN_EMAILS,
    SITE_URL: !!process.env.SITE_URL,
  };
  let expected: string[] = [];
  try {
    const journal = JSON.parse(readFileSync(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"));
    expected = journal.entries.map((e: { tag: string }) => e.tag);
  } catch {}

  const out: Record<string, unknown> = { env, migrationsInBuild: expected.length, startupMigration: getMigrationStatus() };
  let sql: ReturnType<typeof postgres> | undefined;
  try {
    sql = postgres(databaseUrl(), { max: 1, connect_timeout: 8, onnotice: () => {} });
    await sql`select 1`;
    out.database = "connected";
    const [{ exists }] = await sql`select to_regclass('impexsphere.__migrations') is not null as exists`;
    out.migrationsApplied = exists ? Number((await sql`select count(*)::int as n from impexsphere.__migrations`)[0].n) : 0;
    const tables = await sql`select table_name from information_schema.tables where table_schema = 'impexsphere' order by 1`;
    out.tables = tables.map((t) => t.table_name);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    out.database = `error: ${e.code ?? ""} ${(e.message ?? String(err)).replace(/postgres(ql)?:\/\/\S+/gi, "[url]")}`.slice(0, 300);
  } finally {
    await sql?.end().catch(() => {});
  }
  const healthy = out.database === "connected" && out.migrationsApplied === expected.length;
  return NextResponse.json({ healthy, ...out }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
