import { and, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OfferCard } from "@/components/messaging";
import { offerPriceLabel } from "@/lib/offerFormat";
import { StatusPill } from "@/components/ui";
import { categories, getDb, offers, rfqs } from "@/db";
import { requireUser } from "@/lib/auth";
import { ago } from "@/lib/format";
import { BUYER_VISIBLE, offerViews, threadIdsForOffers } from "@/lib/messaging";

export const metadata: Metadata = { title: "Your buying request" };

export default async function BuyerRequest({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const user = await requireUser(undefined, `/account/requests/${ref}`);
  const db = getDb();
  const [r] = await db
    .select({ r: rfqs, category: categories.name })
    .from(rfqs)
    .leftJoin(categories, eq(rfqs.categoryId, categories.id))
    .where(and(eq(rfqs.ref, ref), eq(rfqs.userId, user.id)))
    .limit(1);
  if (!r) notFound();
  const rows = await db
    .select()
    .from(offers)
    .where(and(eq(offers.rfqId, r.r.id), inArray(offers.status, [...BUYER_VISIBLE])));
  const [views, threadIds] = await Promise.all([offerViews(rows), threadIdsForOffers(rows)]);
  views.sort((a, b) => a.usdMt - b.usdMt);
  const live = views.filter((o) => o.status === "shared" && !(o.validUntil && new Date(o.validUntil) < new Date()));
  const bestId = live[0]?.id;
  const accepted = views.find((o) => o.status === "accepted");

  return (
    <section className="page-hero">
      <div className="container">
        <nav className="breadcrumbs"><Link href="/account">Your account</Link> / <span className="mono">{r.r.ref}</span></nav>
        <div className="dash-head">
          <div>
            <div className="tags" style={{ marginBottom: 10 }}>
              <StatusPill status={r.r.status === "pending" ? "in_review" : r.r.status} />
              {r.category && <span className="chip">{r.category}</span>}
              <span className="chip">Posted {ago(r.r.createdAt.toISOString())}</span>
            </div>
            <h1 className="dash-h1">{r.r.commodity}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {r.r.quantity} → {r.r.destination}{r.r.incoterm ? ` · ${r.r.incoterm}` : ""}{r.r.targetPrice ? ` · target ${r.r.targetPrice}` : ""}
            </p>
          </div>
        </div>

        {r.r.status === "pending" && (
          <div className="card banner"><div><b>In review</b><p className="muted" style={{ margin: 0 }}>Our trade desk is checking your request before matching it with suppliers.</p></div></div>
        )}
        {accepted && (
          <div className="card banner" style={{ borderColor: "rgba(61,220,151,0.35)", background: "linear-gradient(90deg, rgba(61,220,151,0.1), transparent)" }}>
            <div>
              <b>You accepted {accepted.supplierName}&apos;s offer ({offerPriceLabel(accepted)}/{accepted.unit})</b>
              <p className="muted" style={{ margin: 0 }}>The trade desk will send the proforma invoice and payment details.</p>
            </div>
            {threadIds.get(accepted.id) && <Link href={`/messages/${threadIds.get(accepted.id)}`} className="btn btn-sm">Open conversation</Link>}
          </div>
        )}

        <div className="panel-head" style={{ marginTop: 26 }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Offers {views.length ? `(${views.length})` : ""}</h2>
        </div>
        {views.length > 1 && (
          <div className="card table-wrap" style={{ marginBottom: 18 }}>
            <table className="table">
              <thead>
                <tr><th>Supplier</th><th>Price</th><th>≈ US$/MT</th><th>Quantity</th><th>Terms</th><th>Dispatch</th><th>Status</th></tr>
              </thead>
              <tbody>
                {views.map((o) => (
                  <tr key={o.id}>
                    <td>{o.supplierName}</td>
                    <td className="mono">{offerPriceLabel(o)}/{o.unit}</td>
                    <td className={`mono${o.id === bestId ? " up" : ""}`}>{Math.round(o.usdMt).toLocaleString("en-US")}{o.id === bestId ? " ★" : ""}</td>
                    <td>{o.quantity}</td>
                    <td>{o.incoterm ? `${o.incoterm}${o.port ? ` ${o.port}` : ""}` : "—"}</td>
                    <td>{o.leadTimeDays != null ? `${o.leadTimeDays} d` : "—"}</td>
                    <td><StatusPill status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {views.length ? (
          <div className="offer-grid">
            {views.map((o) => (
              <OfferCard key={o.id} o={o} as="buyer" threadId={threadIds.get(o.id)} best={o.id === bestId && live.length > 1} />
            ))}
          </div>
        ) : (
          <div className="card empty">
            <div className="big">⏳</div>
            <p>No offers yet. Suppliers&apos; offers appear here once our trade desk has checked them against your spec.</p>
          </div>
        )}
      </div>
    </section>
  );
}
