import { and, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { PasswordForm, ProfileForm, ResendVerification, SignOutButton } from "@/components/AccountForms";
import Icon from "@/components/Icon";
import { StatusPill } from "@/components/ui";
import { enquiries, getDb, listings, rfqs, threads } from "@/db";
import { requireUser } from "@/lib/auth";
import { ago } from "@/lib/format";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ verified?: string; reset?: string }> }) {
  const user = await requireUser(undefined, "/account");
  const sp = await searchParams;
  const db = getDb();
  const [myRfqs, myQuotes] = await Promise.all([
    db
      .select({
        ref: rfqs.ref,
        commodity: rfqs.commodity,
        quantity: rfqs.quantity,
        destination: rfqs.destination,
        status: rfqs.status,
        createdAt: rfqs.createdAt,
        offers: sql<number>`(select count(*)::int from impexsphere.offers o where o.rfq_id = ${rfqs.id} and o.status in ('shared','accepted','declined'))`,
      })
      .from(rfqs)
      .where(eq(rfqs.userId, user.id))
      .orderBy(desc(rfqs.createdAt))
      .limit(50),
    db
      .select({
        id: enquiries.id,
        kind: enquiries.kind,
        commodity: enquiries.commodity,
        quantity: enquiries.quantity,
        status: enquiries.status,
        createdAt: enquiries.createdAt,
        slug: listings.slug,
        threadId: threads.id,
        quotes: sql<number>`(select count(*)::int from impexsphere.offers o where o.enquiry_id = ${enquiries.id} and o.status in ('shared','accepted','declined'))`,
      })
      .from(enquiries)
      .leftJoin(listings, eq(enquiries.listingId, listings.id))
      .leftJoin(threads, eq(threads.enquiryId, enquiries.id))
      .where(and(eq(enquiries.userId, user.id), eq(enquiries.kind, "listing_quote")))
      .orderBy(desc(enquiries.createdAt))
      .limit(50),
  ]);

  return (
    <section className="page-hero">
      <div className="container">
        <div className="dash-head">
          <div>
            <span className="eyebrow">Your account</span>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", margin: 0 }}>Hello, {user.name.split(" ")[0]}.</h1>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {user.email} · <span style={{ textTransform: "capitalize" }}>{user.role}</span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {user.role === "admin" && <Link href="/admin" className="btn btn-gold btn-sm">Admin console</Link>}
            {user.supplier && <Link href="/dashboard" className="btn btn-gold btn-sm">Supplier dashboard</Link>}
            <SignOutButton />
          </div>
        </div>

        {sp.verified === "1" && <div className="form-ok" style={{ marginBottom: 16 }}>Email confirmed. Thanks!</div>}
        {sp.verified === "0" && <div className="form-error" style={{ marginBottom: 16 }}>That confirmation link is invalid or has expired.</div>}
        {sp.reset === "1" && <div className="form-ok" style={{ marginBottom: 16 }}>Your password has been changed.</div>}
        {!user.emailVerifiedAt && (
          <div className="card banner">
            <div>
              <b>Confirm your email</b>
              <p className="muted" style={{ margin: 0 }}>We sent a link to {user.email}. Confirming it lets us send you offers and replies.</p>
            </div>
            <ResendVerification />
          </div>
        )}

        {user.role !== "supplier" && (
          <div className="dash-grid">
            <div className="card panel">
              <div className="panel-head">
                <h2>Your buying requests</h2>
                <Link href="/rfq#post" className="btn btn-sm">
                  <Icon name="plus" size={14} /> New request
                </Link>
              </div>
              {myRfqs.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Ref</th><th>Commodity</th><th>Quantity</th><th>Offers</th><th>Status</th><th>Posted</th></tr>
                    </thead>
                    <tbody>
                      {myRfqs.map((r) => (
                        <tr key={r.ref}>
                          <td className="mono"><Link href={`/account/requests/${r.ref}`} className="link">{r.ref}</Link></td>
                          <td>{r.commodity}</td>
                          <td>{r.quantity} → {r.destination}</td>
                          <td>{r.offers ? <Link href={`/account/requests/${r.ref}`} className="badge badge-verified">{r.offers} offer{r.offers > 1 ? "s" : ""}</Link> : <span className="muted">—</span>}</td>
                          <td><StatusPill status={r.status === "pending" ? "in_review" : r.status} /></td>
                          <td className="muted">{ago(r.createdAt.toISOString())}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No buying requests yet. Requests you post while signed in appear here.</p>
              )}
            </div>
            <div className="card panel">
              <div className="panel-head">
                <h2>Your quote requests</h2>
                <Link href="/marketplace" className="btn btn-sm">Browse offers</Link>
              </div>
              {myQuotes.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Item</th><th>Quantity</th><th>Quotes</th><th>Status</th><th>Sent</th><th /></tr>
                    </thead>
                    <tbody>
                      {myQuotes.map((q) => (
                        <tr key={q.id}>
                          <td>{q.slug ? <Link href={`/marketplace/${q.slug}`} className="link">{q.commodity}</Link> : q.commodity ?? "Message"}</td>
                          <td>{q.quantity ?? "—"}</td>
                          <td>{q.quotes ? <span className="badge badge-verified">{q.quotes} quote{q.quotes > 1 ? "s" : ""}</span> : <span className="muted">—</span>}</td>
                          <td><StatusPill status={q.status} /></td>
                          <td className="muted">{ago(q.createdAt.toISOString())}</td>
                          <td>{q.threadId && <Link href={`/messages/${q.threadId}`} className="btn btn-sm">Conversation</Link>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No quote requests yet. Open any listing and request a firm quote.</p>
              )}
            </div>
          </div>
        )}

        <div className="dash-grid">
          <div className="card panel">
            <h2>Profile</h2>
            <ProfileForm name={user.name} phone={user.phone} email={user.email} />
          </div>
          <div className="card panel">
            <h2>Password</h2>
            <PasswordForm />
          </div>
        </div>
      </div>
    </section>
  );
}
