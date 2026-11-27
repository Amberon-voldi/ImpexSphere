import Link from "next/link";
import Icon from "@/components/Icon";
import { Counter, Stagger, StaggerItem } from "@/components/fx";
import { StatusPill } from "@/components/ui";
import { requireSupplier } from "@/lib/auth";
import { ago, qty } from "@/lib/format";
import { rfqsForSupplier, supplierQuoteRequests, supplierStats } from "@/lib/supplierData";

export default async function DashboardHome() {
  const user = await requireSupplier("/dashboard");
  const [stats, quotes, rfqList] = await Promise.all([
    supplierStats(user.supplier.id),
    supplierQuoteRequests(user.supplier.id, 6),
    rfqsForSupplier(user.supplier.id),
  ]);
  const matching = rfqList.filter((r) => r.match && !r.offer);

  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Overview</span>
          <h1 className="dash-h1">Good to see you, {user.name.split(" ")[0]}.</h1>
        </div>
        <Link href="/dashboard/listings/new" className="btn btn-gold">
          <Icon name="plus" size={16} /> New listing
        </Link>
      </div>

      <Stagger className="kpis">
        {[
          ["Active listings", stats.active, `${stats.total} total`],
          ["Stock on offer", Math.round(stats.stock / 1000), "metric tonnes"],
          ["Listing views", stats.views, "all time"],
          ["Quote requests", stats.quotes30, "last 30 days"],
        ].map(([label, n, sub]) => (
          <StaggerItem key={label as string} className="card kpi">
            <span>{label}</span>
            <b><Counter to={n as number} duration={1.2} /></b>
            <small>{sub}</small>
          </StaggerItem>
        ))}
      </Stagger>

      {stats.stale > 0 && (
        <div className="card banner">
          <div>
            <b>{stats.stale} active {stats.stale === 1 ? "listing hasn't" : "listings haven't"} been updated in 2 weeks</b>
            <p className="muted" style={{ margin: 0 }}>Buyers trust fresh prices. Confirm price and stock in a few seconds.</p>
          </div>
          <Link href="/dashboard/listings" className="btn btn-sm">Update now</Link>
        </div>
      )}

      <div className="dash-grid">
        <div className="card panel">
          <div className="panel-head">
            <h2>Latest quote requests</h2>
            <Link href="/dashboard/requests" className="link">View all</Link>
          </div>
          {quotes.length ? (
            <ul className="feed">
              {quotes.map((q) => (
                <li key={q.id}>
                  <div>
                    <b>{q.listing.title}</b>
                    <span className="muted">{q.quantity ?? "—"} · to {q.country ?? "—"}{q.incoterm ? ` · ${q.incoterm}` : ""}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <StatusPill status={q.status} />
                    <small className="muted" style={{ display: "block" }}>{ago(q.createdAt.toISOString())}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No quote requests yet. Requests on your listings will show up here.</p>
          )}
        </div>
        <div className="card panel">
          <div className="panel-head">
            <h2>Buying requests for you</h2>
            <Link href="/dashboard/rfqs" className="link">View all</Link>
          </div>
          {matching.length ? (
            <ul className="feed">
              {matching.slice(0, 6).map((r) => (
                <li key={r.ref}>
                  <div>
                    <b>{r.commodity}</b>
                    <span className="muted">{r.quantity} → {r.destination}</span>
                  </div>
                  <Link href={`/dashboard/rfqs#${r.ref}`} className="btn btn-sm">Offer</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No open requests match your categories right now. {rfqList.length ? <Link href="/dashboard/rfqs" className="link">See all {rfqList.length} open requests</Link> : null}</p>
          )}
        </div>
      </div>
      <p className="fine" style={{ marginTop: 20 }}>
        Stock figures: {qty(stats.stock)} across active listings.
      </p>
    </>
  );
}
