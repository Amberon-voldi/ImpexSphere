/**
 * Applies pending database migrations when the server starts, so each deploy
 * brings the `impexsphere` schema up to date (production RDS isn't reachable
 * from outside to run `npm run db:migrate`). Already-applied migrations are
 * skipped, so this is safe on every start.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    await import("./migrate-on-start");
  }
}
