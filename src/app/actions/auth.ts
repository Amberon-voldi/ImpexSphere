"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, sessions, suppliers, users } from "@/db";
import {
  consumeToken,
  createSession,
  destroyOtherSessions,
  destroySession,
  hashPassword,
  isAdminEmail,
  issueToken,
  passwordProblem,
  recordAttempt,
  requestMeta,
  requireUser,
  safeNext,
  siteUrl,
  tooManyAttempts,
  verifyPassword,
} from "@/lib/auth";
import { actionEmail, emailConfigured, sendEmail } from "@/lib/email";
import { EMAIL_RE } from "@/lib/validate";
import { slugify, uniqueSlug } from "@/lib/slug";

export type FormState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const keep = (f: FormData, ...keys: string[]) => Object.fromEntries(keys.map((k) => [k, str(f, k)]));

// A real hash, so sign-in takes the same time whether or not the email exists.
let dummyHash: Promise<string> | undefined;

async function sendVerification(userId: string, email: string) {
  try {
    const token = await issueToken(userId, "verify_email", 48);
    const url = `${await siteUrl()}/verify-email?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Confirm your ImpexSphere email",
      ...actionEmail("Confirm your email", "Confirm this address to finish setting up your ImpexSphere account.", "Confirm email", url),
    });
  } catch (err) {
    console.error("Verification email failed", err);
  }
}

export async function signUp(_: FormState, f: FormData): Promise<FormState> {
  const values = keep(f, "name", "email", "phone", "role", "company", "city", "state");
  const name = str(f, "name", 120);
  const email = str(f, "email", 200).toLowerCase();
  const password = String(f.get("password") ?? "");
  const role = str(f, "role") === "supplier" ? "supplier" : "buyer";
  const phone = str(f, "phone", 40) || null;

  if (!name || !email) return { error: "Please enter your name and email.", values };
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address.", values };
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr, values };
  if (f.get("terms") !== "on") return { error: "Please accept the terms to continue.", values };

  const company = str(f, "company", 160);
  const city = str(f, "city", 80);
  const state = str(f, "state", 80);
  if (role === "supplier" && (!company || !city || !state)) return { error: "Please enter your company name, city and state.", values };

  const { ip } = await requestMeta();
  const ipKey = ip ?? "unknown";
  if (await tooManyAttempts("signup", ipKey, 10, 60)) return { error: "Too many sign-ups from this network. Please try again later.", values };
  await recordAttempt("signup", ipKey, false);

  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "An account with this email already exists. Try signing in.", values };

  const passwordHash = await hashPassword(password);
  let userId: string;
  try {
    userId = await db.transaction(async (tx) => {
      let supplierId: string | null = null;
      if (role === "supplier") {
        const slug = await uniqueSlug(slugify(company), async (s) => {
          const [r] = await tx.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.slug, s)).limit(1);
          return !!r;
        });
        const [sup] = await tx
          .insert(suppliers)
          .values({ slug, name: company, city, state, status: "pending", level: "listed", contactEmail: email })
          .returning({ id: suppliers.id });
        supplierId = sup.id;
      }
      const [u] = await tx
        .insert(users)
        .values({ email, passwordHash, name, phone, role: isAdminEmail(email) ? "admin" : role, supplierId })
        .returning({ id: users.id });
      return u.id;
    });
  } catch (err) {
    console.error("Sign-up failed", err);
    return { error: "We couldn't create your account. Please try again.", values };
  }

  await createSession(userId);
  await sendVerification(userId, email);
  redirect(isAdminEmail(email) ? "/admin" : role === "supplier" ? "/dashboard" : "/account");
}

export async function signIn(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email", 200).toLowerCase();
  const password = String(f.get("password") ?? "");
  const values = { email };
  if (!email || !password) return { error: "Please enter your email and password.", values };

  const { ip } = await requestMeta();
  if ((await tooManyAttempts("login", email, 8, 15)) || (await tooManyAttempts("login-ip", ip ?? "unknown", 40, 15)))
    return { error: "Too many sign-in attempts. Please wait 15 minutes and try again.", values };

  const [u] = await getDb()
    .select({ id: users.id, hash: users.passwordHash, role: users.role, disabled: users.disabled })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  dummyHash ??= hashPassword("not-a-real-password");
  const ok = await verifyPassword(password, u?.hash ?? (await dummyHash));
  if (!u || !ok || u.disabled) {
    await recordAttempt("login", email, false);
    await recordAttempt("login-ip", ip ?? "unknown", false);
    return { error: u?.disabled && ok ? "This account has been disabled. Contact us for help." : "Email or password is incorrect.", values };
  }
  await recordAttempt("login", email, true);
  await createSession(u.id);
  redirect(safeNext(f.get("next"), u.role === "admin" ? "/admin" : u.role === "supplier" ? "/dashboard" : "/account"));
}

export async function signOut() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordReset(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email", 200).toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address.", values: { email } };
  if (!emailConfigured()) return { error: "Password reset by email isn't available yet. Please contact us and we'll help you get back in.", values: { email } };

  const { ip } = await requestMeta();
  if (await tooManyAttempts("reset", ip ?? "unknown", 5, 15)) return { error: "Too many requests. Please try again in 15 minutes." };
  await recordAttempt("reset", ip ?? "unknown", false);

  const [u] = await getDb().select({ id: users.id, disabled: users.disabled }).from(users).where(eq(users.email, email)).limit(1);
  if (u && !u.disabled) {
    try {
      const token = await issueToken(u.id, "reset_password", 1);
      const url = `${await siteUrl()}/reset-password?token=${token}`;
      await sendEmail({
        to: email,
        subject: "Reset your ImpexSphere password",
        ...actionEmail("Reset your password", "Use the link below to choose a new password. It expires in one hour.", "Choose a new password", url),
      });
    } catch (err) {
      console.error("Reset email failed", err);
    }
  }
  // Same answer whether or not the account exists.
  return { ok: "If an account exists for that email, we've sent a link to reset the password." };
}

export async function resetPassword(_: FormState, f: FormData): Promise<FormState> {
  const token = str(f, "token", 200);
  const password = String(f.get("password") ?? "");
  const pwErr = passwordProblem(password);
  if (pwErr) return { error: pwErr };
  const userId = await consumeToken(token, "reset_password");
  if (!userId) return { error: "This reset link is invalid or has expired. Request a new one." };
  const db = getDb();
  await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await createSession(userId);
  redirect("/account?reset=1");
}

export async function resendVerification(): Promise<FormState> {
  const user = await requireUser();
  if (user.emailVerifiedAt) return { ok: "Your email is already confirmed." };
  if (!emailConfigured()) return { error: "Email isn't set up on this site yet." };
  if (await tooManyAttempts("verify", user.id, 3, 60)) return { error: "We've sent a few already. Please check your inbox and spam folder." };
  await recordAttempt("verify", user.id, false);
  await sendVerification(user.id, user.email);
  return { ok: `We've sent a new confirmation link to ${user.email}.` };
}

export async function updateProfile(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(f, "name", 120);
  if (!name) return { error: "Please enter your name." };
  await getDb()
    .update(users)
    .set({ name, phone: str(f, "phone", 40) || null, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  return { ok: "Profile saved." };
}

export async function changePassword(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(f.get("current") ?? "");
  const next = String(f.get("password") ?? "");
  const [u] = await getDb().select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!u || !(await verifyPassword(current, u.hash))) return { error: "Your current password is incorrect." };
  const pwErr = passwordProblem(next);
  if (pwErr) return { error: pwErr };
  await getDb().update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, user.id));
  await destroyOtherSessions(user.id);
  return { ok: "Password changed. Other devices have been signed out." };
}
