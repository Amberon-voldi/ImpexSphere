import { count, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import AdminFilter from "@/components/AdminFilter";
import { OfferCard } from "@/components/messaging";
import { getDb, offers } from "@/db";
import { offerViews, threadIdsForOffers } from "@/lib/messaging";

export const metadata: Metadata = { title: "Offers" };
const STATUS = [["submitted", "To review"], ["shared", "Shared"], ["accepted", "Accepted"], ["declined", "Declined"], ["rejected", "Not shared"], ["withdrawn", "Withdrawn"]] as [string, string][];

export default async function AdminOffers({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const db = getDb();
  const valid = STATUS.some(([v]) => v === status);
  const [rows, counts] = await Promise.all([
    db
      .select()
      .from(offers)
      .where(valid ? eq(offers.status, status as "submitted") : undefined)
      .orderBy(sql`case ${offers.status} when 'submitted' then 0 when 'accepted' then 1 else 2 end`, desc(offers.createdAt))
      .limit(200),
    db.select({ status: offers.status, n: count() }).from(offers).groupBy(offers.status),
  ]);
  const [views, threadIds] = await Promise.all([offerViews(rows), threadIdsForOffers(rows)]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Offers</span>
          <h1 className="dash-h1">Review supplier offers</h1>
          <p className="muted" style={{ margin: 0 }}>Buyers only see offers you share. Check price, spec and terms against the request first.</p>
        </div>
      </div>
      <AdminFilter base="/admin/offers" param="status" current={status} options={[["", "All"], ...STATUS.map(([v, t]) => [v, t, n(v)] as [string, string, number])]} />
      {views.length ? (
        <div className="offer-grid">
          {views.map((o) => <OfferCard key={o.id} o={o} as="admin" threadId={threadIds.get(o.id)} />)}
        </div>
      ) : (
        <div className="card empty">No offers match.</div>
      )}
    </>
  );
}
