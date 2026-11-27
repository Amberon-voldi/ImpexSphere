import type { Metadata } from "next";
import { Expand, OfferForm } from "@/components/dashboard";
import { StatusPill } from "@/components/ui";
import { requireSupplier } from "@/lib/auth";
import { ago } from "@/lib/format";
import { getSupplierRow, rfqsForSupplier } from "@/lib/supplierData";

export const metadata: Metadata = { title: "Buying requests" };

export default async function SupplierRfqs() {
  const user = await requireSupplier("/dashboard/rfqs");
  const [rows, sup] = await Promise.all([rfqsForSupplier(user.supplier.id), getSupplierRow(user.supplier.id)]);
  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Buying requests</span>
          <h1 className="dash-h1">Open requests from importers</h1>
          <p className="muted" style={{ margin: 0 }}>Requests in your categories are shown first. Send an offer and the trade desk will follow up.</p>
        </div>
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
                      {r.offer && <StatusPill status={`offer ${r.offer.status === "new" ? "sent" : r.offer.status}`} />}
                    </div>
                    <b>{r.commodity}</b>
                    <span className="muted">{r.quantity} → {r.destination}{r.incoterm ? ` · ${r.incoterm}` : ""}{r.targetPrice ? ` · target ${r.targetPrice}` : ""}</span>
                  </div>
                }
              >
                {r.specs && <p style={{ color: "var(--ink-2)" }}>{r.specs}</p>}
                {r.deliveryBy && <p className="muted">Needed: {r.deliveryBy}</p>}
                {r.offer ? (
                  <p className="muted">You sent an offer {ago(r.offer.createdAt.toISOString())}. The trade desk will be in touch.</p>
                ) : (
                  <OfferForm refId={r.ref} defaultLocation={sup ? `${sup.city}, ${sup.state}` : ""} />
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
