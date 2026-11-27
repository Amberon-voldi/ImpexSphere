import type { Metadata } from "next";
import Link from "next/link";
import { Expand } from "@/components/dashboard";
import { SupplierOfferForm } from "@/components/messaging";
import { StatusPill } from "@/components/ui";
import { requireSupplier } from "@/lib/auth";
import { ago } from "@/lib/format";
import { rfqsForSupplier } from "@/lib/supplierData";

export const metadata: Metadata = { title: "Buying requests" };

export default async function SupplierRfqs() {
  const user = await requireSupplier("/dashboard/rfqs");
  const rows = await rfqsForSupplier(user.supplier.id);
  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Buying requests</span>
          <h1 className="dash-h1">Open requests from importers</h1>
          <p className="muted" style={{ margin: 0 }}>Requests in your categories come first. Send a priced offer; the trade desk reviews it and shares it with the buyer.</p>
        </div>
        <Link href="/dashboard/offers" className="btn btn-sm">My offers</Link>
      </div>
      {rows.length ? (
        <div className="rfq-list">
          {rows.map((r) => (
            <div key={r.ref} id={r.ref} className="card" style={{ scrollMarginTop: 100 }}>
              <Expand
                summary={
                  <div className="rfq-sum">
                    <div className="top">
                      {r.category && <span className="chip chip-dot" style={{ ["--c" as string]: r.category.hue }}>{r.category.name}</span>}
                      <span className="mono muted">{r.ref}</span>
                      <span className="muted">{ago(r.createdAt.toISOString())}</span>
                      {r.match && <span className="badge badge-verified">Matches you</span>}
                      {r.offer && <StatusPill status={r.offer.status} />}
                    </div>
                    <b>{r.commodity}</b>
                    <span className="muted">{r.quantity} → {r.destination}{r.incoterm ? ` · ${r.incoterm}` : ""}{r.targetPrice ? ` · target ${r.targetPrice}` : ""}</span>
                  </div>
                }
              >
                {r.specs && <p style={{ color: "var(--ink-2)" }}>{r.specs}</p>}
                {r.deliveryBy && <p className="muted">Needed: {r.deliveryBy}</p>}
                {r.offer ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="muted">You sent offer <span className="mono">{r.offer.ref}</span> {ago(r.offer.createdAt.toISOString())}.</span>
                    {r.offer.threadId && <Link href={`/messages/${r.offer.threadId}`} className="btn btn-sm">Open conversation</Link>}
                  </div>
                ) : (
                  <SupplierOfferForm rfq={r.ref} defaults={{ incoterm: r.incoterm, port: r.destination }} />
                )}
              </Expand>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty">No open buying requests right now.</div>
      )}
    </>
  );
}
