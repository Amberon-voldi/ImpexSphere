import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, count, eq, gt, isNull, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authAttempts, authTokens, getDb, sessions, suppliers, users, type User } from "@/db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

export const SESSION_COOKIE = "isx_session";
const SESSION_DAYS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

// ---------- Passwords ----------

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, n, r, p, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Returns an error message, or null if the password is acceptable. */
export function passwordProblem(pw: string) {
  if (pw.length < 10) return "Use at least 10 characters for your password.";
  if (pw.length > 200) return "That password is too long.";
  return null;
}

// ---------- Tokens ----------

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

// ---------- Request info ----------

export async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: h.get("user-agent")?.slice(0, 500) || null,
  };
}

export async function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// ---------- Sessions ----------

export async function createSession(userId: string) {
  const token = newToken();
  const meta = await requestMeta();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const db = getDb();
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt, ...meta });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  // Housekeeping: drop this user's expired sessions.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.id, sha256(token))).catch(() => {});
  jar.delete(SESSION_COOKIE);
}

export async function destroyOtherSessions(userId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const all = await getDb().select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
  const keep = token ? sha256(token) : "";
  for (const s of all) if (s.id !== keep) await getDb().delete(sessions).where(eq(sessions.id, s.id));
}

export type SessionUser = Pick<User, "id" | "email" | "name" | "phone" | "role" | "supplierId" | "emailVerifiedAt"> & {
  supplier: { id: string; name: string; slug: string; status: "pending" | "approved" | "suspended" } | null;
};

/** The signed-in user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const [row] = await getDb()
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        supplierId: users.supplierId,
        emailVerifiedAt: users.emailVerifiedAt,
        disabled: users.disabled,
        supplier: { id: suppliers.id, name: suppliers.name, slug: suppliers.slug, status: suppliers.status },
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .leftJoin(suppliers, eq(users.supplierId, suppliers.id))
      .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
      .limit(1);
    if (!row || row.disabled) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { disabled, supplier, ...u } = row;
    return { ...u, supplier: supplier?.id ? supplier : null };
  } catch (err) {
    console.error("Session lookup failed", err);
    return null;
  }
});

/** Use in pages, layouts and server actions. Redirects to sign-in if needed. */
export async function requireUser(role?: SessionUser["role"] | SessionUser["role"][], next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  const roles = role ? (Array.isArray(role) ? role : [role]) : null;
  if (roles && !roles.includes(user.role)) redirect("/account");
  return user;
}

export async function requireSupplier(next?: string) {
  const user = await requireUser(["supplier", "admin"], next);
  if (!user.supplier) redirect(user.role === "admin" ? "/admin" : "/account");
  return user as SessionUser & { supplier: NonNullable<SessionUser["supplier"]> };
}

export const isAdminEmail = (email: string) =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());

// ---------- Rate limiting ----------

/** True if this action/key has exceeded `max` failed attempts within `minutes`. */
export async function tooManyAttempts(action: string, key: string, max: number, minutes: number) {
  const [r] = await getDb()
    .select({ n: count() })
    .from(authAttempts)
    .where(
      and(
        eq(authAttempts.action, action),
        eq(authAttempts.key, key),
        eq(authAttempts.success, false),
        gt(authAttempts.createdAt, new Date(Date.now() - minutes * 60_000)),
      ),
    );
  return r.n >= max;
}

export async function recordAttempt(action: string, key: string, success: boolean) {
  await getDb().insert(authAttempts).values({ action, key, success });
}

// ---------- One-time tokens ----------

export async function issueToken(userId: string, kind: "verify_email" | "reset_password", hours: number) {
  const token = newToken();
  await getDb()
    .insert(authTokens)
    .values({ id: sha256(token), userId, kind, expiresAt: new Date(Date.now() + hours * 3600_000) });
  return token;
}

/** Marks a token used and returns its user id, or null if invalid/expired/used. */
export async function consumeToken(token: string, kind: "verify_email" | "reset_password") {
  const [row] = await getDb()
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, sha256(token)), eq(authTokens.kind, kind), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .returning({ userId: authTokens.userId });
  return row?.userId ?? null;
}

/** Only allow same-site relative redirects after sign-in. */
export function safeNext(next: unknown, fallback = "/account") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
