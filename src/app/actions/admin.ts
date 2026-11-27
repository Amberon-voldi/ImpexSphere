"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { enquiries, getDb, listings, rfqs, sessions, suppliers, users } from "@/db";
import { requireUser } from "@/lib/auth";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const oneOf = <T extends string>(v: string, opts: readonly T[]) => (opts.includes(v as T) ? (v as T) : null);

function refreshPublic() {
  revalidatePath("/", "layout");
}

export async function setSupplier(f: FormData) {
  await requireUser("admin");
  const id = str(f, "id", 64);
  const status = oneOf(str(f, "status"), ["pending", "approved", "suspended"] as const);
  const level = oneOf(str(f, "level"), ["listed", "verified", "trusted"] as const);
  const set: Partial<typeof suppliers.$inferInsert> = { updatedAt: new Date() };
  if (status) set.status = status;
  if (level) set.level = level;
  await getDb().update(suppliers).set(set).where(eq(suppliers.id, id));
  refreshPublic();
}

export async function setListing(f: FormData) {
  await requireUser("admin");
  const id = str(f, "id", 64);
  const status = oneOf(str(f, "status"), ["draft", "active", "paused", "sold_out"] as const);
  const featured = str(f, "featured");
  const set: Partial<typeof listings.$inferInsert> = {};
  if (status) set.status = status;
  if (featured === "1" || featured === "0") set.featured = featured === "1";
  if (Object.keys(set).length) await getDb().update(listings).set(set).where(eq(listings.id, id));
  refreshPublic();
}

export async function setRfq(f: FormData) {
  await requireUser("admin");
  const status = oneOf(str(f, "status"), ["pending", "open", "closed", "spam"] as const);
  if (status) await getDb().update(rfqs).set({ status, updatedAt: new Date() }).where(eq(rfqs.id, str(f, "id", 64)));
  refreshPublic();
}

export async function setEnquiry(f: FormData) {
  await requireUser("admin");
  const id = str(f, "id", 64);
  const status = oneOf(str(f, "status"), ["new", "in_progress", "closed", "spam"] as const);
  const set: Partial<typeof enquiries.$inferInsert> = { updatedAt: new Date() };
  if (status) set.status = status;
  if (f.has("adminNote")) set.adminNote = str(f, "adminNote", 4000) || null;
  await getDb().update(enquiries).set(set).where(eq(enquiries.id, id));
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
}

export async function setUser(f: FormData) {
  const me = await requireUser("admin");
  const id = str(f, "id", 64);
  if (id === me.id) return; // don't lock yourself out
  const role = oneOf(str(f, "role"), ["buyer", "supplier", "admin"] as const);
  const disabled = str(f, "disabled");
  const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (role) set.role = role;
  if (disabled === "1" || disabled === "0") set.disabled = disabled === "1";
  await getDb().update(users).set(set).where(eq(users.id, id));
  if (disabled === "1") await getDb().delete(sessions).where(eq(sessions.userId, id));
  revalidatePath("/admin/users");
}
