import type { Metadata } from "next";
import Link from "next/link";
import { ListingRow } from "@/components/dashboard";
import Icon from "@/components/Icon";
import { requireSupplier } from "@/lib/auth";
import { supplierListings } from "@/lib/supplierData";

export const metadata: Metadata = { title: "Listings" };

export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireSupplier("/dashboard/listings");
  const { saved } = await searchParams;
  const rows = await supplierListings(user.supplier.id);
  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Listings</span>
          <h1 className="dash-h1">Your offers</h1>
          <p className="muted" style={{ margin: 0 }}>Edit price, stock and status right in the table. Price changes are added to the listing&apos;s price chart.</p>
        </div>
        <Link href="/dashboard/listings/new" className="btn btn-gold">
          <Icon name="plus" size={16} /> New listing
        </Link>
      </div>
      {saved && <div className="form-ok" style={{ marginBottom: 16 }}><Icon name="check" size={15} stroke={2.6} /> Saved “{saved}”.</div>}
      {rows.length ? (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Listing</th>
                <th colSpan={3}>Price · Stock · Status</th>
                <th>Views</th>
                <th>Quotes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <ListingRow key={l.id} l={{ ...l, updatedAt: l.updatedAt.toISOString() }} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty">
          <div className="big">📦</div>
          <p>You haven&apos;t listed anything yet.</p>
          <Link href="/dashboard/listings/new" className="btn btn-gold">Create your first listing</Link>
        </div>
      )}
    </>
  );
}
