import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/db/url";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl() },
  // Only manage our own schema; never touch tables other apps keep in this database.
  schemaFilter: ["impexsphere"],
  // Keep the migrations log inside our schema too, so it can't mix with another app's drizzle log.
  migrations: { schema: "impexsphere", table: "__migrations" },
  strict: true,
});
