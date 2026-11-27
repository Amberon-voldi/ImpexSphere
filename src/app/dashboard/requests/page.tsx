import type { Metadata } from "next";
import Link from "next/link";
import { requireSupplier } from "@/lib/auth";
import { ago, inr } from "@/lib/format";
import { supplierQuoteRequests } from "@/lib/supplierData";

export const metadata: Metadata = { title: "Quote requests" };

export default async function RequestsPage() {
  const user = await requireSupplier("/dashboard/requests");
  const rows = await supplierQuoteRequests(user.supplier.id);
  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Quote requests</span>
          <h1 className="dash-h1">Buyers asking about your listings</h1>
          <p className="muted" style={{ margin: 0 }}>
            Reply with a firm quote and chat with the buyer. The ImpexSphere trade desk reviews quotes before the buyer sees them, and buyer contact details stay with the trade desk.
          </p>
        </div>
      </div>
      {rows.length ? (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th>Listing</th><th>Quantity</th><th>Destination</th><th>Notes</th><th>Quotes</th><th>Received</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/dashboard/listings/${q.listing.id}`} className="link">{q.listing.title}</Link>
                    <div className="muted mono" style={{ fontSize: "0.78rem" }}>{inr(q.listing.price)}/kg listed</div>
                  </td>
                  <td>{q.quantity ?? "—"}</td>
                  <td>{q.country ?? "—"}{q.incoterm ? ` · ${q.incoterm}` : ""}</td>
                  <td className="muted" style={{ maxWidth: 280 }}>{q.message ?? "—"}</td>
                  <td>{q.quotes ? <span className="badge badge-verified">{q.quotes} sent</span> : <span className="muted">—</span>}</td>
                  <td className="muted">{ago(q.createdAt.toISOString())}</td>
                  <td>
                    <Link href={`/messages/quote/${q.id}`} className={`btn btn-sm${q.quotes ? "" : " btn-gold"}`}>
                      {q.quotes ? "Conversation" : "Reply with quote"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty">No quote requests yet. Keep prices and stock fresh to rank higher in the marketplace.</div>
      )}
    </>
  );
}
