import { NextResponse } from "next/server";
import { getActiveListings, getCategories, getSuppliers } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Lightweight index for the ⌘K command palette. */
export async function GET() {
  try {
    const [listings, suppliers, categories] = await Promise.all([getActiveListings(), getSuppliers(), getCategories()]);
    return NextResponse.json(
      {
        listings: listings.map((l) => ({
          slug: l.slug,
          title: l.title,
          price: l.price,
          origin: l.origin,
          category: l.category.name,
          hue: l.category.hue,
          supplier: l.supplier.name,
        })),
        suppliers: suppliers.map((s) => ({ slug: s.slug, name: s.name, city: s.city, state: s.state, level: s.level })),
        categories: categories.map((c) => ({ slug: c.slug, name: c.name, hue: c.hue, count: c.count })),
      },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("Search index failed", err);
    return NextResponse.json({ error: "Search is unavailable right now." }, { status: 503 });
  }
}
