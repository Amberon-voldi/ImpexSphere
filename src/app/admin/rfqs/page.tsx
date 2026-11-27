import { count, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { setRfq } from "@/app/actions/admin";
import AdminFilter from "@/components/AdminFilter";
import { AutoSelect, Expand } from "@/components/dashboard";
import { StatusPill } from "@/components/ui";
import { categories, getDb, rfqs } from "@/db";
import { ago } from "@/lib/format";

export const metadata: Metadata = { title: "Buying requests" };
const STATUS = [["pending", "Pending review"], ["open", "Open (public)"], ["closed", "Closed"], ["spam", "Spam"]] as [string, string][];

export default async function AdminRfqs({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const db = getDb();
  const valid = STATUS.some(([v]) => v === status);
  const [rows, counts] = await Promise.all([
    db
      .select({
        r: rfqs,
        category: categories.name,
        offers: sql<number>`(select count(*)::int from impexsphere.enquiries e where e.rfq_id = ${rfqs.id})`,
      })
      .from(rfqs)
      .leftJoin(categories, eq(rfqs.categoryId, categories.id))
      .where(valid ? eq(rfqs.status, status as "open") : undefined)
      .orderBy(desc(rfqs.createdAt))
      .limit(200),
    db.select({ status: rfqs.status, n: count() }).from(rfqs).groupBy(rfqs.status),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Buying requests</span>
          <h1 className="dash-h1">Review and publish RFQs</h1>
          <p className="muted" style={{ margin: 0 }}>New requests stay private until you set them to Open. The public board never shows buyer contact details.</p>
        </div>
      </div>
      <AdminFilter base="/admin/rfqs" param="status" current={status} options={[["", "All"], ...STATUS.map(([v, t]) => [v, t, n(v)] as [string, string, number])]} />
      <div className="rfq-list">
        {rows.map(({ r, category, offers }) => (
          <div key={r.id} className="card">
            <Expand
              summary={
                <div className="rfq-sum">
                  <div className="top">
                    <StatusPill status={r.status} />
                    <span className="mono muted">{r.ref}</span>
                    {category && <span className="chip">{category}</span>}
                    <span className="muted">{ago(r.createdAt.toISOString())}</span>
                    {offers > 0 && <span className="badge badge-verified">{offers} offer{offers > 1 ? "s" : ""}</span>}
                    {r.isSample && <span className="badge badge-sample">Sample</span>}
                  </div>
                  <b>{r.commodity}</b>
                  <span className="muted">{r.quantity} → {r.destination}{r.incoterm ? ` · ${r.incoterm}` : ""} · {r.buyerCompany}</span>
                </div>
              }
            >
              <dl className="review">
                <dt>Buyer</dt><dd>{r.buyerName}, {r.buyerCompany}</dd>
                <dt>Email</dt><dd><a className="link" href={`mailto:${r.buyerEmail}`}>{r.buyerEmail}</a></dd>
                {r.buyerPhone && (<><dt>Phone</dt><dd>{r.buyerPhone}</dd></>)}
                {r.specs && (<><dt>Specs</dt><dd style={{ whiteSpace: "pre-wrap" }}>{r.specs}</dd></>)}
                {r.targetPrice && (<><dt>Target</dt><dd>{r.targetPrice}</dd></>)}
                {r.deliveryBy && (<><dt>Needed by</dt><dd>{r.deliveryBy}</dd></>)}
              </dl>
              <div className="admin-actions">
                <form action={setRfq}>
                  <input type="hidden" name="id" value={r.id} />
                  <AutoSelect name="status" value={r.status} options={STATUS} label="Status" />
                </form>
                {offers > 0 && <Link href={`/admin/enquiries?kind=rfq_offer`} className="btn btn-sm">See offers</Link>}
                {r.status === "open" && <Link href={`/rfq/${r.ref}`} className="btn btn-sm btn-ghost" target="_blank">Public page ↗</Link>}
              </div>
            </Expand>
          </div>
        ))}
        {!rows.length && <div className="card empty">No buying requests match.</div>}
      </div>
    </>
  );
}
