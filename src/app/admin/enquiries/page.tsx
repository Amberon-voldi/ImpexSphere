import { and, count, desc, eq, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { setEnquiry } from "@/app/actions/admin";
import AdminFilter from "@/components/AdminFilter";
import { Expand } from "@/components/dashboard";
import { StatusPill, SubmitButton } from "@/components/ui";
import { enquiries, getDb, listings, rfqs, suppliers } from "@/db";
import { ago } from "@/lib/format";

export const metadata: Metadata = { title: "Enquiries" };

const KIND = { listing_quote: "Quote request", rfq_offer: "RFQ offer", supplier_application: "Supplier application", contact: "Contact" } as const;
const STATUS = [["new", "New"], ["in_progress", "In progress"], ["closed", "Closed"], ["spam", "Spam"]] as [string, string][];

export default async function AdminEnquiries({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const where: SQL[] = [];
  if (sp.status && STATUS.some(([v]) => v === sp.status)) where.push(eq(enquiries.status, sp.status as "new"));
  if (sp.kind && sp.kind in KIND) where.push(eq(enquiries.kind, sp.kind as "contact"));
  const [rows, counts] = await Promise.all([
    db
      .select({
        e: enquiries,
        listing: { title: listings.title, slug: listings.slug },
        rfqRef: rfqs.ref,
        supplierName: suppliers.name,
      })
      .from(enquiries)
      .leftJoin(listings, eq(enquiries.listingId, listings.id))
      .leftJoin(rfqs, eq(enquiries.rfqId, rfqs.id))
      .leftJoin(suppliers, eq(listings.supplierId, suppliers.id))
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(enquiries.createdAt))
      .limit(200),
    db.select({ status: enquiries.status, n: count() }).from(enquiries).groupBy(enquiries.status),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Enquiries</span>
          <h1 className="dash-h1">Every form submission</h1>
        </div>
      </div>
      <AdminFilter base="/admin/enquiries" param="status" current={sp.status} options={[["", "All"], ...STATUS.map(([v, t]) => [v, t, n(v)] as [string, string, number])]} />
      <AdminFilter base={`/admin/enquiries`} param="kind" current={sp.kind} options={[["", "All types"], ...Object.entries(KIND)]} />
      <div className="rfq-list">
        {rows.map(({ e, listing, rfqRef, supplierName }) => (
          <div key={e.id} className="card">
            <Expand
              summary={
                <div className="rfq-sum">
                  <div className="top">
                    <StatusPill status={e.status} />
                    <span className="chip">{KIND[e.kind]}</span>
                    <span className="muted">{ago(e.createdAt.toISOString())}</span>
                  </div>
                  <b>{e.company} · {e.name}</b>
                  <span className="muted">
                    {listing?.title ?? e.commodity ?? (e.message ? e.message.slice(0, 80) : "")}
                    {e.quantity ? ` · ${e.quantity}` : ""}
                    {e.country ? ` · ${e.country}` : ""}
                  </span>
                </div>
              }
            >
              <dl className="review">
                <dt>Email</dt><dd><a className="link" href={`mailto:${e.email}`}>{e.email}</a></dd>
                {e.phone && (<><dt>Phone</dt><dd><a className="link" href={`tel:${e.phone}`}>{e.phone}</a></dd></>)}
                {listing && (<><dt>Listing</dt><dd><Link className="link" href={`/marketplace/${listing.slug}`}>{listing.title}</Link>{supplierName ? ` · ${supplierName}` : ""}</dd></>)}
                {rfqRef && (<><dt>Buying request</dt><dd className="mono">{rfqRef}</dd></>)}
                {[["Commodity", e.commodity], ["Quantity", e.quantity], ["Destination", e.country], ["Incoterm", e.incoterm], ["Location", e.location], ["Capacity", e.capacity], ["Service", e.service]]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (<div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>))}
                {e.message && (<><dt>Message</dt><dd style={{ whiteSpace: "pre-wrap" }}>{e.message}</dd></>)}
              </dl>
              <form action={setEnquiry} className="admin-actions">
                <input type="hidden" name="id" value={e.id} />
                <label className="field" style={{ flex: 1, minWidth: 220 }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Internal note (never shown to customers)</span>
                  <textarea name="adminNote" defaultValue={e.adminNote ?? ""} style={{ minHeight: 70 }} />
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                  <select name="status" defaultValue={e.status} className="select select-sm" aria-label="Status">
                    {STATUS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                  <SubmitButton className="btn btn-gold btn-sm" pendingText="Saving…">Save</SubmitButton>
                </div>
              </form>
            </Expand>
          </div>
        ))}
        {!rows.length && <div className="card empty">No enquiries match.</div>}
      </div>
    </>
  );
}
