import type { Metadata } from "next";
import Link from "next/link";
import { ListingEditor } from "@/components/dashboard";
import { requireSupplier } from "@/lib/auth";
import { allCategories } from "@/lib/supplierData";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListing() {
  const user = await requireSupplier("/dashboard/listings/new");
  const cats = await allCategories();
  return (
    <>
      <div className="dash-head">
        <div>
          <nav className="breadcrumbs"><Link href="/dashboard/listings">Listings</Link> / <span>New</span></nav>
          <h1 className="dash-h1">New listing</h1>
        </div>
      </div>
      <ListingEditor listing={{ status: "active" }} categories={cats} approved={user.supplier.status === "approved"} />
    </>
  );
}
