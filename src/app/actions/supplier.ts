"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { categories, getDb, listingPrices, listings, suppliers } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { incoterms as INCOTERMS } from "@/lib/content";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { FormState } from "./auth";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const list = (v: string) =>
  v
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);
const num = (f: FormData, k: string) => {
  const v = Number(String(f.get(k) ?? "").replace(/,/g, ""));
  return Number.isFinite(v) ? v : NaN;
};
const LISTING_STATUSES = ["draft", "active", "paused", "sold_out"] as const;
type ListingStatus = (typeof LISTING_STATUSES)[number];

function today() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Records today's price in the listing's history (one point per day). */
async function recordPrice(listingId: string, price: number) {
  await getDb()
    .insert(listingPrices)
    .values({ listingId, priceInrKg: price, recordedOn: today() })
    .onConflictDoUpdate({ target: [listingPrices.listingId, listingPrices.recordedOn], set: { priceInrKg: price } });
}

async function ownListing(id: string, supplierId: string) {
  const [l] = await getDb()
    .select({ id: listings.id, slug: listings.slug, price: listings.priceInrKg })
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.supplierId, supplierId)))
    .limit(1);
  return l ?? null;
}

function refresh(slug?: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/marketplace");
  if (slug) revalidatePath(`/marketplace/${slug}`);
}

export async function saveListing(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireSupplier();
  const supplierId = user.supplier.id;
  const id = str(f, "id", 64);
  const values = Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

  const title = str(f, "title", 140);
  const categorySlug = str(f, "category", 80);
  const form = str(f, "form", 120);
  const origin = str(f, "origin", 120);
  const price = num(f, "price");
  const moqKg = Math.round(num(f, "moq"));
  const stockKg = Math.round(num(f, "stock"));
  const leadTimeDays = Math.round(num(f, "leadTime"));
  const status = str(f, "status") as ListingStatus;

  if (!title || !categorySlug || !form || !origin) return { error: "Please fill in the title, category, form and origin.", values };
  if (!(price > 0 && price < 1_000_000)) return { error: "Enter a price per kg greater than zero.", values };
  if (!(moqKg > 0) || !(stockKg >= 0)) return { error: "Enter a minimum order and available stock in kg.", values };
  if (!(leadTimeDays >= 0 && leadTimeDays <= 365)) return { error: "Enter a dispatch time between 0 and 365 days.", values };
  if (!LISTING_STATUSES.includes(status)) return { error: "Choose a status.", values };

  const [cat] = await getDb().select({ id: categories.id }).from(categories).where(eq(categories.slug, categorySlug)).limit(1);
  if (!cat) return { error: "Choose a category.", values };

  const keys = f.getAll("specKey").map(String);
  const vals = f.getAll("specValue").map(String);
  const specs = keys
    .map((k, i) => [k.trim().slice(0, 60), (vals[i] ?? "").trim().slice(0, 120)] as [string, string])
    .filter(([k, v]) => k && v)
    .slice(0, 15);

  const data = {
    title,
    categoryId: cat.id,
    variety: str(f, "variety", 80) || null,
    grade: str(f, "grade", 80) || null,
    form,
    origin,
    summary: str(f, "summary", 1000),
    priceInrKg: Math.round(price * 100) / 100,
    moqKg,
    stockKg,
    leadTimeDays,
    packing: str(f, "packing", 160),
    incoterms: f.getAll("incoterms").map(String).filter((t) => (INCOTERMS as string[]).includes(t)),
    certifications: list(str(f, "certifications", 600)),
    specs,
    labReport: f.get("labReport") === "on",
    status: stockKg === 0 && status === "active" ? ("sold_out" as const) : status,
    updatedAt: new Date(),
  };

  const db = getDb();
  let slug: string;
  let listingId: string;
  if (id) {
    const own = await ownListing(id, supplierId);
    if (!own) return { error: "Listing not found.", values };
    await db.update(listings).set(data).where(eq(listings.id, id));
    slug = own.slug;
    listingId = id;
    if (own.price !== data.priceInrKg) await recordPrice(id, data.priceInrKg);
  } else {
    slug = await uniqueSlug(slugify(`${title}-${origin}`), async (s) => {
      const [r] = await db.select({ id: listings.id }).from(listings).where(eq(listings.slug, s)).limit(1);
      return !!r;
    });
    const [row] = await db.insert(listings).values({ ...data, slug, supplierId }).returning({ id: listings.id });
    listingId = row.id;
    await recordPrice(listingId, data.priceInrKg);
  }
  refresh(slug);
  redirect(`/dashboard/listings?saved=${encodeURIComponent(title)}`);
}

/** Inline price / stock / status update from the listings table. */
export async function quickUpdateListing(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireSupplier();
  const own = await ownListing(str(f, "id", 64), user.supplier.id);
  if (!own) return { error: "Listing not found." };
  const price = num(f, "price");
  const stockKg = Math.round(num(f, "stock"));
  let status = str(f, "status") as ListingStatus;
  if (!(price > 0 && price < 1_000_000)) return { error: "Price must be above zero." };
  if (!(stockKg >= 0)) return { error: "Stock can't be negative." };
  if (!LISTING_STATUSES.includes(status)) return { error: "Invalid status." };
  if (stockKg === 0 && status === "active") status = "sold_out";
  const p = Math.round(price * 100) / 100;
  await getDb().update(listings).set({ priceInrKg: p, stockKg, status, updatedAt: new Date() }).where(eq(listings.id, own.id));
  if (p !== own.price) await recordPrice(own.id, p);
  refresh(own.slug);
  return { ok: "Saved" };
}

export async function deleteListing(f: FormData) {
  const user = await requireSupplier();
  const own = await ownListing(str(f, "id", 64), user.supplier.id);
  if (own) await getDb().delete(listings).where(eq(listings.id, own.id));
  refresh(own?.slug);
  redirect("/dashboard/listings");
}

export async function updateCompany(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireSupplier();
  const name = str(f, "name", 160);
  const city = str(f, "city", 80);
  const state = str(f, "state", 80);
  if (!name || !city || !state) return { error: "Company name, city and state are required." };
  const since = Math.round(num(f, "sinceYear"));
  await getDb()
    .update(suppliers)
    .set({
      name,
      city,
      state,
      about: str(f, "about", 2000),
      sinceYear: since > 1800 && since <= new Date().getFullYear() ? since : null,
      capabilities: list(str(f, "capabilities", 800)),
      certifications: list(str(f, "certifications", 800)),
      contactEmail: str(f, "contactEmail", 200) || null,
      updatedAt: new Date(),
    })
    .where(eq(suppliers.id, user.supplier.id));
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/suppliers/${user.supplier.slug}`);
  return { ok: "Company profile saved." };
}
