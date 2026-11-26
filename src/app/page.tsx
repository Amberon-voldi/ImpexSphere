import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import { products, tradeSteps, trustPillars, verticals } from "@/lib/content";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">B2B import–export · Indian commodities</span>
            <h1>
              Indian spices, sourced from <em>verified</em> suppliers and shipped on order.
            </h1>
            <p className="lead">
              ImpexSphere connects overseas importers with India&apos;s producers and processors. We buy only
              against confirmed, prepaid orders, check quality before shipment and handle export end to end.
            </p>
            <div className="btn-row">
              <Link href="/buyers#quote" className="btn btn-primary">Request a quote</Link>
              <Link href="/suppliers#register" className="btn btn-ghost">I&apos;m a supplier</Link>
            </div>
          </div>
          <aside className="hero-card" aria-label="How an order works">
            <h3>How every trade works</h3>
            <ol className="hero-steps">
              <li><span className="n">1</span><div><strong>You order.</strong> <span>Spec, quantity, price, delivery.</span></div></li>
              <li className="gate"><span className="n">2</span><div><strong>You pay an advance.</strong> <span>100% by default, 40–50% by agreement.</span></div></li>
              <li><span className="n">3</span><div><strong>We procure &amp; inspect.</strong> <span>From verified Indian suppliers, checked against your spec.</span></div></li>
              <li><span className="n">4</span><div><strong>We pack, document &amp; ship.</strong> <span>Export paperwork, freight and customs handled.</span></div></li>
            </ol>
          </aside>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">What we trade</span>
            <h2>Starting with India&apos;s signature spices</h2>
            <p className="lead">Turmeric, red chilli and cumin today, with more agricultural commodities added as our supplier network grows.</p>
          </div>
          <div className="grid grid-3">
            {products.map((p) => (
              <Link key={p.slug} href={`/products#${p.slug}`} className="card product" style={{ textDecoration: "none" }}>
                <span className="origin">{p.origin}</span>
                <h3>{p.name}</h3>
                <p>{p.summary}</p>
                <span className="note" style={{ marginTop: "auto", color: "var(--navy)", fontWeight: 600 }}>View specifications →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">One platform, four services</span>
            <h2>From a single shipment to a global sourcing network</h2>
          </div>
          <div className="grid grid-4">
            {verticals.map((v) => (
              <div key={v.key} className="card">
                <span className="badge">{v.key}</span>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">The order-backed model</span>
            <h2>We never buy on speculation</h2>
            <p className="lead">Procurement starts only once the buyer&apos;s advance has arrived, so there is no unsold stock and no speculative risk passed on to you.</p>
          </div>
          <ol className="steps">
            {tradeSteps.map((s, i) => (
              <li key={s.title} className={i === 2 ? "gate" : undefined}>
                <strong>{s.title}</strong>
                <span>{s.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Built on trust</span>
            <h2>A network grown from real trades, not cold listings</h2>
            <p className="lead">Most listing sites start with unverified data. We start with suppliers we have already traded with.</p>
          </div>
          <div className="grid grid-3">
            {trustPillars.map((t) => (
              <div key={t.title} className="card">
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div>
            <span className="eyebrow">For buyers</span>
            <h2>Reliable supply, clear terms</h2>
            <ul className="checklist">
              <li>Importers, distributors, food processors and commodity traders</li>
              <li>Quality inspected against your agreed specification</li>
              <li>Lab reports and documents with every lot</li>
              <li>Export paperwork, freight and customs handled</li>
            </ul>
            <Link href="/buyers" className="btn btn-primary">How buying works</Link>
          </div>
          <div>
            <span className="eyebrow">For suppliers</span>
            <h2>Reach overseas demand</h2>
            <ul className="checklist">
              <li>No export licence? We buy from you and export in our name</li>
              <li>Already exporting? We coordinate your logistics for a fee</li>
              <li>Producers, processors, wholesalers and traders welcome</li>
              <li>Early access to the ImpexSphere marketplace</li>
            </ul>
            <Link href="/suppliers" className="btn btn-ghost">How supplying works</Link>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
