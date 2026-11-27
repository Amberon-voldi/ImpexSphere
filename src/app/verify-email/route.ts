import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, users } from "@/db";
import { consumeToken } from "@/lib/auth";
import { claimByEmail } from "@/lib/messaging";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const userId = token ? await consumeToken(token, "verify_email").catch(() => null) : null;
  if (userId) {
    const [u] = await getDb().update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId)).returning({ email: users.email });
    // Attach anything they sent with this email while signed out.
    if (u) await claimByEmail(userId, u.email).catch((e) => console.error("claimByEmail failed", e));
  }
  return NextResponse.redirect(new URL(userId ? "/account?verified=1" : "/account?verified=0", url));
}
