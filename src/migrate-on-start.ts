// Runs on server start, see src/instrumentation.ts. Node.js runtime only.
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { databaseUrl } from "./db/url";
import { setMigrationStatus } from "./lib/health";

async function run() {
  let sql: ReturnType<typeof postgres> | undefined;
  try {
    sql = postgres(databaseUrl(), { max: 1, onnotice: () => {}, connect_timeout: 15 });
    console.log("[migrate] applying pending migrations…");
    // Same schema/table as drizzle.config.ts, so `npm run db:migrate` sees the same log.
    await migrate(drizzle(sql), {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
      migrationsSchema: "impexsphere",
      migrationsTable: "__migrations",
    });
    console.log("[migrate] database is up to date");
    setMigrationStatus({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    console.error("[migrate] FAILED — run `npm run db:migrate` manually", err);
    setMigrationStatus({ ok: false, at: new Date().toISOString(), error: describe(err) });
  } finally {
    await sql?.end().catch(() => {});
  }
}

/** Error summary without connection strings or credentials. */
function describe(err: unknown) {
  const e = err as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = e?.cause?.code ?? e?.code;
  const msg = (e?.cause?.message ?? e?.message ?? String(err)).replace(/postgres(ql)?:\/\/\S+/gi, "[url]");
  return `${code ? code + ": " : ""}${msg}`.slice(0, 300);
}

await run();
