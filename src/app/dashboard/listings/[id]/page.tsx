import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteListing } from "@/app/actions/supplier";
import { ListingEditor } from "@/components/dashboard";
import { categories, getDb, listings } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { allCategories } from "@/lib/supplierData";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSupplier(`/dashboard/listings/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [l] = await getDb()
    .select({ listing: listings, category: categories.slug })
    .from(listings)
    .innerJoin(categories, eq(listings.categoryId, categories.id))
    .where(and(eq(listings.id, id), eq(listings.supplierId, user.supplier.id)))
    .limit(1);
  if (!l) notFound();
  const cats = await allCategories();
  const x = l.listing;
  return (
    <>
      <div className="dash-head">
        <div>
          <nav className="breadcrumbs"><Link href="/dashboard/listings">Listings</Link> / <span>{x.title}</span></nav>
          <h1 className="dash-h1">Edit listing</h1>
        </div>
        <form action={deleteListing}>
          <input type="hidden" name="id" value={x.id} />
          <button className="btn btn-sm btn-ghost danger" type="submit">Delete listing</button>
        </form>
      </div>
      <ListingEditor
        categories={cats}
        approved={user.supplier.status === "approved"}
        listing={{
          id: x.id,
          title: x.title,
          category: l.category,
          variety: x.variety,
          grade: x.grade,
          form: x.form,
          origin: x.origin,
          summary: x.summary,
          price: x.priceInrKg,
          moqKg: x.moqKg,
          stockKg: x.stockKg,
          leadTimeDays: x.leadTimeDays,
          packing: x.packing,
          incoterms: x.incoterms,
          certifications: x.certifications,
          specs: x.specs,
          labReport: x.labReport,
          status: x.status,
        }}
      />
    </>
  );
}
