import "server-only";
import { and, asc, desc, eq, gte, inArray, ne, sql, type SQL } from "drizzle-orm";
import { categories, getDb, listingPrices, listings, rfqs, suppliers } from "@/db";
import type { CardListing, CategoryInfo, SupplierCard, PublicRfq } from "./types";

const DAY = 24 * 3600 * 1000;

async function sparklines(ids: string[], days = 30) {
  const map = new Map<string, number[]>();
  if (!ids.length) return map;
  const rows = await getDb()
    .select({ id: listingPrices.listingId, p: listingPrices.priceInrKg })
    .from(listingPrices)
    .where(and(inArray(listingPrices.listingId, ids), gte(listingPrices.recordedOn, new Date(Date.now() - days * DAY))))
    .orderBy(asc(listingPrices.recordedOn));
  for (const r of rows) {
    const a = map.get(r.id) ?? [];
    a.push(r.p);
    map.set(r.id, a);
  }
  return map;
}

const cardSelect = {
  id: listings.id,
  slug: listings.slug,
  title: listings.title,
  form: listings.form,
  origin: listings.origin,
  grade: listings.grade,
  price: listings.priceInrKg,
  moqKg: listings.moqKg,
  stockKg: listings.stockKg,
  leadTimeDays: listings.leadTimeDays,
  incoterms: listings.incoterms,
  certifications: listings.certifications,
  labReport: listings.labReport,
  featured: listings.featured,
  views: listings.views,
  isSample: listings.isSample,
  updatedAt: listings.updatedAt,
  supplier: {
    slug: suppliers.slug,
    name: suppliers.name,
    city: suppliers.city,
    state: suppliers.state,
    level: suppliers.level,
    rating: suppliers.rating,
  },
  category: {
    slug: categories.slug,
    name: categories.name,
    hue: categories.hue,
    shape: categories.shape,
  },
};

type CardRow = Awaited<ReturnType<typeof baseListingQuery>>[number];

async function toCards(rows: CardRow[]): Promise<CardListing[]> {
  const spark = await sparklines(rows.map((r) => r.id));
  return rows.map((r) => {
    const s = spark.get(r.id) ?? [r.price];
    const first = s[0] ?? r.price;
    return {
      ...r,
      updatedAt: r.updatedAt.toISOString(),
      spark: s,
      change: first ? ((r.price - first) / first) * 100 : 0,
    };
  });
}

function baseListingQuery(...extra: SQL[]) {
  return getDb()
    .select(cardSelect)
    .from(listings)
    .innerJoin(suppliers, eq(listings.supplierId, suppliers.id))
    .innerJoin(categories, eq(listings.categoryId, categories.id))
    .where(and(eq(listings.status, "active"), ...extra))
    .orderBy(desc(listings.featured), desc(listings.updatedAt));
}

export async function getActiveListings() {
  return toCards(await baseListingQuery());
}

export async function getCategories(): Promise<CategoryInfo[]> {
  const rows = await getDb()
    .select({
      slug: categories.slug,
      name: categories.name,
      blurb: categories.blurb,
      hue: categories.hue,
      shape: categories.shape,
      count: sql<number>`count(${listings.id})::int`,
      minPrice: sql<number | null>`min(${listings.priceInrKg})::float`,
    })
    .from(categories)
    .leftJoin(listings, and(eq(listings.categoryId, categories.id), eq(listings.status, "active")))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));
  return rows;
}

export async function getListing(slug: string) {
  const db = getDb();
  const [row] = await db
    .select({
      ...cardSelect,
      summary: listings.summary,
      variety: listings.variety,
      packing: listings.packing,
      specs: listings.specs,
      status: listings.status,
      supplierFull: {
        about: suppliers.about,
        sinceYear: suppliers.sinceYear,
        responseHours: suppliers.responseHours,
        completedTrades: suppliers.completedTrades,
        certifications: suppliers.certifications,
        capabilities: suppliers.capabilities,
      },
      categoryId: listings.categoryId,
    })
    .from(listings)
    .innerJoin(suppliers, eq(listings.supplierId, suppliers.id))
    .innerJoin(categories, eq(listings.categoryId, categories.id))
    .where(and(eq(listings.slug, slug), ne(listings.status, "draft")))
    .limit(1);
  if (!row) return null;

  const [history, relatedRows] = await Promise.all([
    db
      .select({ p: listingPrices.priceInrKg, d: listingPrices.recordedOn })
      .from(listingPrices)
      .where(eq(listingPrices.listingId, row.id))
      .orderBy(asc(listingPrices.recordedOn)),
    baseListingQuery(eq(listings.categoryId, row.categoryId), ne(listings.id, row.id)).limit(4),
  ]);

  // Count the view without slowing the page down.
  db.update(listings)
    .set({ views: sql`${listings.views} + 1` })
    .where(eq(listings.id, row.id))
    .catch(() => {});

  const first = history[0]?.p ?? row.price;
  return {
    ...row,
    updatedAt: row.updatedAt.toISOString(),
    history: history.map((h) => ({ p: h.p, d: h.d.toISOString() })),
    change: first ? ((row.price - first) / first) * 100 : 0,
    related: await toCards(relatedRows),
  };
}

export async function getSuppliers(): Promise<SupplierCard[]> {
  const rows = await getDb()
    .select({
      slug: suppliers.slug,
      name: suppliers.name,
      city: suppliers.city,
      state: suppliers.state,
      about: suppliers.about,
      level: suppliers.level,
      sinceYear: suppliers.sinceYear,
      rating: suppliers.rating,
      responseHours: suppliers.responseHours,
      completedTrades: suppliers.completedTrades,
      certifications: suppliers.certifications,
      isSample: suppliers.isSample,
      listingCount: sql<number>`count(${listings.id})::int`,
      categories: sql<string[]>`coalesce(array_agg(distinct ${categories.name}) filter (where ${categories.name} is not null), '{}')`,
      hues: sql<string[]>`coalesce(array_agg(distinct ${categories.hue}) filter (where ${categories.hue} is not null), '{}')`,
    })
    .from(suppliers)
    .leftJoin(listings, and(eq(listings.supplierId, suppliers.id), eq(listings.status, "active")))
    .leftJoin(categories, eq(listings.categoryId, categories.id))
    .groupBy(suppliers.id)
    .orderBy(sql`case ${suppliers.level} when 'trusted' then 0 when 'verified' then 1 else 2 end`, desc(suppliers.completedTrades));
  return rows;
}

export async function getSupplier(slug: string) {
  const [s] = await getDb().select().from(suppliers).where(eq(suppliers.slug, slug)).limit(1);
  if (!s) return null;
  const cards = await toCards(await baseListingQuery(eq(listings.supplierId, s.id)));
  return { ...s, listings: cards };
}

export async function getOpenRfqs(limit = 50): Promise<PublicRfq[]> {
  const rows = await getDb()
    .select({
      ref: rfqs.ref,
      commodity: rfqs.commodity,
      specs: rfqs.specs,
      quantity: rfqs.quantity,
      destination: rfqs.destination,
      incoterm: rfqs.incoterm,
      targetPrice: rfqs.targetPrice,
      deliveryBy: rfqs.deliveryBy,
      createdAt: rfqs.createdAt,
      isSample: rfqs.isSample,
      category: { slug: categories.slug, name: categories.name, hue: categories.hue },
    })
    .from(rfqs)
    .leftJoin(categories, eq(rfqs.categoryId, categories.id))
    .where(eq(rfqs.status, "open"))
    .orderBy(desc(rfqs.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function getStats() {
  const [r] = await getDb().execute<{
    listings: number;
    suppliers: number;
    rfqs: number;
    stock: number;
    states: number;
  }>(sql`
    select
      (select count(*)::int from impexsphere.listings where status = 'active') as listings,
      (select count(*)::int from impexsphere.suppliers) as suppliers,
      (select count(*)::int from impexsphere.rfqs where status = 'open') as rfqs,
      (select coalesce(sum(stock_kg), 0)::float / 1000 from impexsphere.listings where status = 'active') as stock,
      (select count(distinct state)::int from impexsphere.suppliers) as states
  `);
  return r;
}

/** Runs a loader and reports failure instead of crashing the page (e.g. database unreachable). */
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<{ data: T; error: boolean }> {
  try {
    return { data: await fn(), error: false };
  } catch (err) {
    console.error("Data load failed", err);
    return { data: fallback, error: true };
  }
}

export async function getOpenRfq(ref: string): Promise<PublicRfq | null> {
  const rows = await getDb()
    .select({
      ref: rfqs.ref,
      commodity: rfqs.commodity,
      specs: rfqs.specs,
      quantity: rfqs.quantity,
      destination: rfqs.destination,
      incoterm: rfqs.incoterm,
      targetPrice: rfqs.targetPrice,
      deliveryBy: rfqs.deliveryBy,
      createdAt: rfqs.createdAt,
      isSample: rfqs.isSample,
      category: { slug: categories.slug, name: categories.name, hue: categories.hue },
    })
    .from(rfqs)
    .leftJoin(categories, eq(rfqs.categoryId, categories.id))
    .where(and(eq(rfqs.ref, ref), eq(rfqs.status, "open")))
    .limit(1);
  const r = rows[0];
  return r ? { ...r, createdAt: r.createdAt.toISOString() } : null;
}
