import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, users } from "@/db";
import { consumeToken } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const userId = token ? await consumeToken(token, "verify_email").catch(() => null) : null;
  if (userId) {
    await getDb().update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  }
  return NextResponse.redirect(new URL(userId ? "/account?verified=1" : "/account?verified=0", url));
}
