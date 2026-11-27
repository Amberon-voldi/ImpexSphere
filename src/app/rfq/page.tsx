import type { Metadata } from "next";
import Link from "next/link";
import RfqItem from "@/components/RfqItem";
import RfqWizard from "@/components/RfqWizard";
import { Reveal, SplitWords, Stagger, StaggerItem } from "@/components/fx";
import { getCurrentUser } from "@/lib/auth";
import { getCategories, getOpenRfqs, safe } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Buying requests",
  description: "Post a buying request for Indian spices and commodities and receive offers from verified suppliers.",
};

export default async function RfqPage({ searchParams }: { searchParams: Promise<{ commodity?: string }> }) {
  const { commodity } = await searchParams;
  const [r, c, user] = await Promise.all([safe(() => getOpenRfqs(), []), safe(getCategories, []), getCurrentUser()]);
  const contact = user ? { name: user.name, company: user.supplier?.name ?? "", email: user.email, phone: user.phone ?? "" } : undefined;
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <span>Buying requests</span>
          </nav>
          <h1>
            <SplitWords text="Tell us what you need." />
          </h1>
          <Reveal delay={0.2}>
            <p className="lead">
              Post a buying request in under a minute. We match it with verified suppliers and send you firm
              offers. Suppliers: browse open requests and send an offer.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="section-sm" style={{ paddingTop: 10 }}>
        <div className="container rfq-layout">
          <div>
            <div className="result-meta">
              <span>
                <b style={{ color: "var(--ink)" }}>{r.data.length}</b> open buying requests
              </span>
            </div>
            {r.error && <div className="notice">Buying requests are temporarily unavailable. Please refresh in a moment.</div>}
            {!r.error && !r.data.length && <div className="card empty">No open requests right now. Be the first to post one.</div>}
            <Stagger className="rfq-list" gap={0.05}>
              {r.data.map((x) => (
                <StaggerItem key={x.ref}>
                  <RfqItem r={x} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          <div className="rfq-sticky" id="post" style={{ scrollMarginTop: 100 }}>
            <Reveal>
              <RfqWizard categories={c.data} initialCommodity={commodity?.slice(0, 300)} contact={contact} />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
