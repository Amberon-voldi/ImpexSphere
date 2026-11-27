/**
 * ONE-OFF: applies pending database migrations when the server starts.
 * Added to create the `impexsphere` schema on the production database, which
 * can't be reached from outside. Remove this file and src/migrate-on-start.ts
 * after that deploy.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    await import("./migrate-on-start");
  }
}
