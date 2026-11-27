import type { Metadata } from "next";
import Link from "next/link";
import { offerPriceLabel } from "@/lib/offerFormat";
import { StatusPill } from "@/components/ui";
import { requireSupplier } from "@/lib/auth";
import { ago } from "@/lib/format";
import { supplierOffers } from "@/lib/supplierData";

export const metadata: Metadata = { title: "My offers" };

const STATUS_HELP: Record<string, string> = {
  submitted: "With the trade desk for review",
  shared: "Shared with the buyer",
  accepted: "Accepted by the buyer",
  declined: "Declined by the buyer",
  withdrawn: "You withdrew it",
  rejected: "Not shared with the buyer",
};

export default async function SupplierOffersPage() {
  const user = await requireSupplier("/dashboard/offers");
  const rows = await supplierOffers(user.supplier.id);
  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Offers</span>
          <h1 className="dash-h1">Offers you&apos;ve sent</h1>
          <p className="muted" style={{ margin: 0 }}>Every offer goes to the trade desk first, then to the buyer.</p>
        </div>
      </div>
      {rows.length ? (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Offer</th><th>For</th><th>Price</th><th>Quantity</th><th>Status</th><th>Sent</th><th /></tr>
            </thead>
            <tbody>
              {rows.map(({ o, rfqRef, rfqCommodity, listingTitle, offerThread, quoteThread }) => {
                const thread = offerThread ?? quoteThread;
                return (
                  <tr key={o.id}>
                    <td className="mono">{o.ref}</td>
                    <td>{rfqRef ? <>{rfqCommodity} <span className="muted mono">({rfqRef})</span></> : <>Quote · {listingTitle}</>}</td>
                    <td className="mono">{offerPriceLabel(o)}/{o.unit}</td>
                    <td>{o.quantity}</td>
                    <td title={STATUS_HELP[o.status]}><StatusPill status={o.status} /></td>
                    <td className="muted">{ago(o.createdAt.toISOString())}</td>
                    <td>{thread && <Link href={`/messages/${thread}`} className="btn btn-sm">Conversation</Link>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty">
          <p>No offers yet.</p>
          <Link href="/dashboard/rfqs" className="btn btn-gold">See open buying requests</Link>
        </div>
      )}
    </>
  );
}
