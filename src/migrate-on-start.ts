// ONE-OFF, see src/instrumentation.ts. Node.js runtime only.
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { databaseUrl } from "./db/url";

async function run() {
  let sql: ReturnType<typeof postgres> | undefined;
  try {
    sql = postgres(databaseUrl(), { max: 1, onnotice: () => {} });
    console.log("[migrate] applying pending migrations…");
    // Same schema/table as drizzle.config.ts, so `npm run db:migrate` sees the same log.
    await migrate(drizzle(sql), {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
      migrationsSchema: "impexsphere",
      migrationsTable: "__migrations",
    });
    console.log("[migrate] database is up to date");
  } catch (err) {
    console.error("[migrate] FAILED — run `npm run db:migrate` manually", err);
  } finally {
    await sql?.end().catch(() => {});
  }
}

await run();
