import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

function client() {
  const url = databaseUrl();
  // Reuse one pool across hot reloads in development.
  globalForDb.sql ??= postgres(url, { max: 10, prepare: false });
  return globalForDb.sql;
}

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  _db ??= drizzle(client(), { schema });
  return _db;
}

export * from "./schema";
