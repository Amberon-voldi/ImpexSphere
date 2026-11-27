import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactFields, Field, LeadForm } from "@/components/forms";
import { Reveal } from "@/components/fx";
import { ago } from "@/lib/format";
import { getOpenRfq } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  const r = await getOpenRfq((await params).ref).catch(() => null);
  return { title: r ? `${r.commodity} — ${r.ref}` : "Buying request" };
}

export default async function RfqDetail({ params }: { params: Promise<{ ref: string }> }) {
  const r = await getOpenRfq((await params).ref);
  if (!r) notFound();
  const facts: [string, string | null][] = [
    ["Quantity", r.quantity],
    ["Destination", r.destination],
    ["Incoterm", r.incoterm],
    ["Target price", r.targetPrice],
    ["Needed by", r.deliveryBy],
    ["Posted", ago(r.createdAt)],
  ];
  return (
    <section className="page-hero">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <Link href="/rfq">Buying requests</Link> / <span className="mono">{r.ref}</span>
        </nav>
        <div className="detail">
          <div>
            <Reveal>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.category && (
                  <span className="chip chip-dot" style={{ ["--c" as string]: r.category.hue }}>
                    {r.category.name}
                  </span>
                )}
                <span className="chip mono">{r.ref}</span>
                {r.isSample && <span className="badge badge-sample">Sample</span>}
              </div>
              <h1>{r.commodity}</h1>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="kv">
                {facts
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <span>{k}</span>
                      <b>{v}</b>
                    </div>
                  ))}
              </div>
            </Reveal>
            {r.specs && (
              <Reveal delay={0.15}>
                <div className="block">
                  <h2>Requirements</h2>
                  <p style={{ color: "var(--ink-2)" }}>{r.specs}</p>
                </div>
              </Reveal>
            )}
            <Reveal delay={0.2}>
              <div className="block">
                <h2>How offers work</h2>
                <ul className="checklist">
                  <li>Send your best price, grade and dispatch time for this request.</li>
                  <li>Our trade desk checks the offer against the buyer&apos;s spec.</li>
                  <li>Shortlisted suppliers are introduced to the buyer, or we buy from you and export as seller of record.</li>
                </ul>
              </div>
            </Reveal>
          </div>
          <div className="card quote-panel" id="offer" style={{ scrollMarginTop: 100 }}>
            <h3 style={{ fontSize: "1.3rem" }}>Send an offer</h3>
            <p className="muted" style={{ fontSize: "0.9rem" }}>For suppliers who can meet this request.</p>
            <LeadForm kind="rfq_offer" hidden={{ rfq: r.ref }} submitLabel="Send offer">
              <ContactFields />
              <div className="form-row">
                <Field name="location" label="Dispatch location" placeholder="e.g. Unjha, Gujarat" />
                <Field name="quantity" label="Quantity you can supply" optional />
              </div>
              <Field name="message" label="Your offer" textarea placeholder="Price, grade, packing, lead time, certifications…" />
            </LeadForm>
          </div>
        </div>
      </div>
    </section>
  );
}
