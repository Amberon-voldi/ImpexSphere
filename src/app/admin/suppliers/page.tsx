import { count, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { setSupplier } from "@/app/actions/admin";
import AdminFilter from "@/components/AdminFilter";
import { AutoSelect, Expand } from "@/components/dashboard";
import { StatusPill } from "@/components/ui";
import { getDb, suppliers } from "@/db";
import { ago } from "@/lib/format";

export const metadata: Metadata = { title: "Suppliers" };
const STATUS = [["pending", "Pending"], ["approved", "Approved"], ["suspended", "Suspended"]] as [string, string][];
const LEVEL = [["listed", "Listed"], ["verified", "Verified"], ["trusted", "Trusted partner"]] as [string, string][];

export default async function AdminSuppliers({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const db = getDb();
  const valid = STATUS.some(([v]) => v === status);
  const [rows, counts] = await Promise.all([
    db
      .select({
        s: suppliers,
        listings: sql<number>`(select count(*)::int from impexsphere.listings l where l.supplier_id = ${suppliers.id})`,
        accounts: sql<string[]>`coalesce((select array_agg(u.email) from impexsphere.users u where u.supplier_id = ${suppliers.id}), '{}')`,
      })
      .from(suppliers)
      .where(valid ? eq(suppliers.status, status as "pending") : undefined)
      .orderBy(sql`case ${suppliers.status} when 'pending' then 0 when 'approved' then 1 else 2 end`, desc(suppliers.createdAt))
      .limit(300),
    db.select({ status: suppliers.status, n: count() }).from(suppliers).groupBy(suppliers.status),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Suppliers</span>
          <h1 className="dash-h1">Verify and manage suppliers</h1>
          <p className="muted" style={{ margin: 0 }}>Only approved suppliers and their listings are visible on the marketplace.</p>
        </div>
      </div>
      <AdminFilter base="/admin/suppliers" param="status" current={status} options={[["", "All"], ...STATUS.map(([v, t]) => [v, t, n(v)] as [string, string, number])]} />
      <div className="rfq-list">
        {rows.map(({ s, listings, accounts }) => (
          <div key={s.id} className="card">
            <Expand
              summary={
                <div className="rfq-sum">
                  <div className="top">
                    <StatusPill status={s.status} />
                    <span className={`badge badge-${s.level}`}>{LEVEL.find(([v]) => v === s.level)?.[1]}</span>
                    <span className="muted">joined {ago(s.createdAt.toISOString())}</span>
                    {s.isSample && <span className="badge badge-sample">Sample</span>}
                  </div>
                  <b>{s.name}</b>
                  <span className="muted">{s.city}, {s.state} · {listings} listing{listings === 1 ? "" : "s"}{accounts.length ? ` · ${accounts.join(", ")}` : ""}</span>
                </div>
              }
            >
              <dl className="review">
                {s.about && (<><dt>About</dt><dd>{s.about}</dd></>)}
                {s.contactEmail && (<><dt>Trade email</dt><dd><a className="link" href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></dd></>)}
                {s.sinceYear && (<><dt>Since</dt><dd>{s.sinceYear}</dd></>)}
                {s.capabilities.length > 0 && (<><dt>Capabilities</dt><dd>{s.capabilities.join(", ")}</dd></>)}
                {s.certifications.length > 0 && (<><dt>Certifications</dt><dd>{s.certifications.join(", ")}</dd></>)}
              </dl>
              <div className="admin-actions">
                <form action={setSupplier}>
                  <input type="hidden" name="id" value={s.id} />
                  <AutoSelect name="status" value={s.status} options={STATUS} label="Status" />
                </form>
                <form action={setSupplier}>
                  <input type="hidden" name="id" value={s.id} />
                  <AutoSelect name="level" value={s.level} options={LEVEL} label="Verification level" />
                </form>
                {s.status === "approved" && <Link className="btn btn-sm btn-ghost" href={`/suppliers/${s.slug}`} target="_blank">Public profile ↗</Link>}
                <Link className="btn btn-sm btn-ghost" href={`/admin/listings?supplier=${s.id}`}>Listings</Link>
              </div>
            </Expand>
          </div>
        ))}
        {!rows.length && <div className="card empty">No suppliers match.</div>}
      </div>
    </>
  );
}
