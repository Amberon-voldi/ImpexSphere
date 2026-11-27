import { and, desc, eq, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { setListing } from "@/app/actions/admin";
import AdminFilter from "@/components/AdminFilter";
import { AutoSelect } from "@/components/dashboard";
import { StatusPill } from "@/components/ui";
import { categories, getDb, listings, suppliers } from "@/db";
import { ago, inr, qty } from "@/lib/format";

export const metadata: Metadata = { title: "Listings" };
const STATUS = [["active", "Active"], ["draft", "Draft"], ["paused", "Paused"], ["sold_out", "Sold out"]] as [string, string][];

export default async function AdminListings({ searchParams }: { searchParams: Promise<{ status?: string; supplier?: string }> }) {
  const sp = await searchParams;
  const where: SQL[] = [];
  if (STATUS.some(([v]) => v === sp.status)) where.push(eq(listings.status, sp.status as "active"));
  if (sp.supplier && /^[0-9a-f-]{36}$/i.test(sp.supplier)) where.push(eq(listings.supplierId, sp.supplier));
  const rows = await getDb()
    .select({ l: listings, supplier: { name: suppliers.name, status: suppliers.status }, category: { name: categories.name, hue: categories.hue } })
    .from(listings)
    .innerJoin(suppliers, eq(listings.supplierId, suppliers.id))
    .innerJoin(categories, eq(listings.categoryId, categories.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(listings.updatedAt))
    .limit(300);
  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Listings</span>
          <h1 className="dash-h1">All listings</h1>
          <p className="muted" style={{ margin: 0 }}>Pause anything that shouldn&apos;t be live, and feature the best offers on the home page.</p>
        </div>
      </div>
      <AdminFilter base="/admin/listings" param="status" current={sp.status} options={[["", "All"], ...STATUS]} />
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Listing</th><th>Supplier</th><th>Price</th><th>Stock</th><th>Updated</th><th>Status</th><th>Featured</th></tr>
          </thead>
          <tbody>
            {rows.map(({ l, supplier, category }) => (
              <tr key={l.id}>
                <td>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: category.hue, flexShrink: 0 }} />
                    <Link className="link" href={`/marketplace/${l.slug}`} target="_blank">{l.title}</Link>
                    {l.isSample && <span className="badge badge-sample">Sample</span>}
                  </div>
                </td>
                <td>{supplier.name} {supplier.status !== "approved" && <StatusPill status={supplier.status} />}</td>
                <td className="mono">{inr(l.priceInrKg)}</td>
                <td className="mono">{qty(l.stockKg)}</td>
                <td className="muted">{ago(l.updatedAt.toISOString())}</td>
                <td>
                  <form action={setListing}>
                    <input type="hidden" name="id" value={l.id} />
                    <AutoSelect name="status" value={l.status} options={STATUS} label="Status" />
                  </form>
                </td>
                <td>
                  <form action={setListing}>
                    <input type="hidden" name="id" value={l.id} />
                    <AutoSelect name="featured" value={l.featured ? "1" : "0"} options={[["0", "No"], ["1", "Featured"]]} label="Featured" />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">No listings match.</div>}
      </div>
    </>
  );
}
