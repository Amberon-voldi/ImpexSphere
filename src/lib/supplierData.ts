import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { categories, enquiries, getDb, listings, rfqs, suppliers } from "@/db";

/** Listing rows for one supplier, with quote-request counts. */
export async function supplierListings(supplierId: string) {
  return getDb()
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      price: listings.priceInrKg,
      stockKg: listings.stockKg,
      moqKg: listings.moqKg,
      status: listings.status,
      views: listings.views,
      updatedAt: listings.updatedAt,
      category: { slug: categories.slug, name: categories.name, hue: categories.hue },
      quotes: sql<number>`(select count(*)::int from impexsphere.enquiries e where e.listing_id = ${listings.id})`,
    })
    .from(listings)
    .innerJoin(categories, eq(listings.categoryId, categories.id))
    .where(eq(listings.supplierId, supplierId))
    .orderBy(desc(listings.updatedAt));
}

/** Quote requests on a supplier's listings. Buyer contact details are deliberately not selected. */
export async function supplierQuoteRequests(supplierId: string, limit = 100) {
  return getDb()
    .select({
      id: enquiries.id,
      createdAt: enquiries.createdAt,
      status: enquiries.status,
      quantity: enquiries.quantity,
      country: enquiries.country,
      incoterm: enquiries.incoterm,
      message: enquiries.message,
      listing: { id: listings.id, title: listings.title, slug: listings.slug, price: listings.priceInrKg },
    })
    .from(enquiries)
    .innerJoin(listings, eq(enquiries.listingId, listings.id))
    .where(and(eq(listings.supplierId, supplierId), eq(enquiries.kind, "listing_quote")))
    .orderBy(desc(enquiries.createdAt))
    .limit(limit);
}

/** Open buying requests, ones matching the supplier's categories first. */
export async function rfqsForSupplier(supplierId: string) {
  const db = getDb();
  const cats = await db.selectDistinct({ id: listings.categoryId }).from(listings).where(eq(listings.supplierId, supplierId));
  const catIds = cats.map((c) => c.id);
  const rows = await db
    .select({
      id: rfqs.id,
      ref: rfqs.ref,
      commodity: rfqs.commodity,
      specs: rfqs.specs,
      quantity: rfqs.quantity,
      destination: rfqs.destination,
      incoterm: rfqs.incoterm,
      targetPrice: rfqs.targetPrice,
      deliveryBy: rfqs.deliveryBy,
      createdAt: rfqs.createdAt,
      categoryId: rfqs.categoryId,
      category: { name: categories.name, hue: categories.hue },
    })
    .from(rfqs)
    .leftJoin(categories, eq(rfqs.categoryId, categories.id))
    .where(eq(rfqs.status, "open"))
    .orderBy(desc(rfqs.createdAt))
    .limit(100);
  const mine = await db
    .select({ rfqId: enquiries.rfqId, status: enquiries.status, createdAt: enquiries.createdAt })
    .from(enquiries)
    .where(and(eq(enquiries.supplierId, supplierId), eq(enquiries.kind, "rfq_offer")));
  const sent = new Map(mine.map((m) => [m.rfqId, m]));
  return rows
    .map((r) => ({ ...r, match: !!r.categoryId && catIds.includes(r.categoryId), offer: sent.get(r.id) ?? null }))
    .sort((a, b) => Number(b.match) - Number(a.match));
}

export async function supplierStats(supplierId: string) {
  const db = getDb();
  const [l] = await db
    .select({
      active: sql<number>`count(*) filter (where ${listings.status} = 'active')::int`,
      total: count(),
      views: sql<number>`coalesce(sum(${listings.views}), 0)::int`,
      stock: sql<number>`coalesce(sum(${listings.stockKg}) filter (where ${listings.status} = 'active'), 0)::int`,
      stale: sql<number>`count(*) filter (where ${listings.status} = 'active' and ${listings.updatedAt} < now() - interval '14 days')::int`,
    })
    .from(listings)
    .where(eq(listings.supplierId, supplierId));
  const [q] = await db
    .select({ n: count() })
    .from(enquiries)
    .innerJoin(listings, eq(enquiries.listingId, listings.id))
    .where(and(eq(listings.supplierId, supplierId), sql`${enquiries.createdAt} > now() - interval '30 days'`));
  return { ...l, quotes30: q.n };
}

export async function allCategories() {
  return getDb().select({ slug: categories.slug, name: categories.name, hue: categories.hue }).from(categories).orderBy(asc(categories.sortOrder));
}

export async function getSupplierRow(id: string) {
  const [s] = await getDb().select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return s;
}

export { inArray };
