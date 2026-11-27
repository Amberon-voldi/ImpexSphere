import { count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Counter, Stagger, StaggerItem } from "@/components/fx";
import { StatusPill } from "@/components/ui";
import { enquiries, getDb, listings, rfqs, suppliers, users } from "@/db";
import { ago } from "@/lib/format";

const KIND = { listing_quote: "Quote request", rfq_offer: "RFQ offer", supplier_application: "Supplier application", contact: "Contact" } as const;

export default async function AdminHome() {
  const db = getDb();
  const [[u], [s], [l], [r], [e], recent, pendingSup, pendingRfq] = await Promise.all([
    db.select({ n: count(), week: sql<number>`count(*) filter (where ${users.createdAt} > now() - interval '7 days')::int` }).from(users),
    db.select({ n: count(), pending: sql<number>`count(*) filter (where ${suppliers.status} = 'pending')::int` }).from(suppliers),
    db.select({ n: sql<number>`count(*) filter (where ${listings.status} = 'active')::int` }).from(listings),
    db.select({ n: sql<number>`count(*) filter (where ${rfqs.status} = 'open')::int`, pending: sql<number>`count(*) filter (where ${rfqs.status} = 'pending')::int` }).from(rfqs),
    db.select({ n: sql<number>`count(*) filter (where ${enquiries.status} = 'new')::int`, week: sql<number>`count(*) filter (where ${enquiries.createdAt} > now() - interval '7 days')::int` }).from(enquiries),
    db.select({ id: enquiries.id, kind: enquiries.kind, company: enquiries.company, commodity: enquiries.commodity, status: enquiries.status, createdAt: enquiries.createdAt }).from(enquiries).orderBy(desc(enquiries.createdAt)).limit(8),
    db.select({ id: suppliers.id, name: suppliers.name, city: suppliers.city, createdAt: suppliers.createdAt }).from(suppliers).where(eq(suppliers.status, "pending")).orderBy(desc(suppliers.createdAt)).limit(5),
    db.select({ ref: rfqs.ref, commodity: rfqs.commodity, company: rfqs.buyerCompany, createdAt: rfqs.createdAt }).from(rfqs).where(eq(rfqs.status, "pending")).orderBy(desc(rfqs.createdAt)).limit(5),
  ]);

  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1 className="dash-h1">Trade desk overview</h1>
        </div>
      </div>
      <Stagger className="kpis">
        {[
          ["New enquiries", e.n, `${e.week} in the last 7 days`, "/admin/enquiries?status=new"],
          ["RFQs to review", r.pending, `${r.n} open on the board`, "/admin/rfqs?status=pending"],
          ["Suppliers to verify", s.pending, `${s.n} suppliers total`, "/admin/suppliers?status=pending"],
          ["Active listings", l.n, `${u.n} users · ${u.week} new this week`, "/admin/listings"],
        ].map(([label, n, sub, href]) => (
          <StaggerItem key={label as string} className="card kpi">
            <Link href={href as string} className="kpi-link">
              <span>{label}</span>
              <b><Counter to={n as number} duration={1.2} /></b>
              <small>{sub}</small>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
      <div className="dash-grid">
        <div className="card panel">
          <div className="panel-head"><h2>Latest enquiries</h2><Link href="/admin/enquiries" className="link">All</Link></div>
          {recent.length ? (
            <ul className="feed">
              {recent.map((x) => (
                <li key={x.id}>
                  <div>
                    <b>{x.company}</b>
                    <span className="muted">{KIND[x.kind]}{x.commodity ? ` · ${x.commodity}` : ""}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <StatusPill status={x.status} />
                    <small className="muted" style={{ display: "block" }}>{ago(x.createdAt.toISOString())}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Nothing yet.</p>}
        </div>
        <div className="card panel">
          <div className="panel-head"><h2>Waiting on you</h2></div>
          <ul className="feed">
            {pendingSup.map((x) => (
              <li key={x.id}>
                <div><b>{x.name}</b><span className="muted">Supplier · {x.city} · {ago(x.createdAt.toISOString())}</span></div>
                <Link href="/admin/suppliers?status=pending" className="btn btn-sm">Review</Link>
              </li>
            ))}
            {pendingRfq.map((x) => (
              <li key={x.ref}>
                <div><b>{x.commodity}</b><span className="muted">RFQ {x.ref} · {x.company} · {ago(x.createdAt.toISOString())}</span></div>
                <Link href="/admin/rfqs?status=pending" className="btn btn-sm">Review</Link>
              </li>
            ))}
            {!pendingSup.length && !pendingRfq.length && <p className="muted">All caught up.</p>}
          </ul>
        </div>
      </div>
    </>
  );
}
