import type { Metadata } from "next";
import EnquiryForm from "@/components/EnquiryForm";
import { tradeSteps } from "@/lib/content";

export const metadata: Metadata = {
  title: "For Buyers",
  description: "Source Indian spices from verified suppliers with order-backed procurement, quality checks and full export handling.",
};

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ commodity?: string }>;
}) {
  const { commodity } = await searchParams;

  return (
    <>
      <section className="page-head">
        <div className="container">
          <span className="eyebrow">For buyers</span>
          <h1>Source from India with confidence</h1>
          <p className="lead">
            For overseas importers, distributors, food processors, commodity traders and domestic bulk buyers who need
            consistent, documented quality and clear commercial terms.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">How an order works</span>
            <h2>Eight steps, one accountable partner</h2>
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

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Payment terms</span>
            <h2>Simple, secured terms</h2>
          </div>
          <div className="table-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th>Option</th>
                  <th>When it&apos;s used</th>
                  <th>What happens</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">100% advance</th>
                  <td>Default, wherever feasible</td>
                  <td>Goods are procured and shipped against full payment.</td>
                </tr>
                <tr>
                  <th scope="row">40–50% advance</th>
                  <td>Negotiated, when deal size and payment security support it</td>
                  <td>Balance is settled against shipping documents as agreed in the contract.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section" id="quote" style={{ scrollMarginTop: 72 }}>
        <div className="container split">
          <div>
            <span className="eyebrow">Request a quote</span>
            <h2>Tell us what you need</h2>
            <p className="lead">Share the commodity, quantity and destination. We&apos;ll come back with pricing, specifications and timelines.</p>
            <ul className="checklist">
              <li>Quality inspected against your agreed specification</li>
              <li>Lab reports and traceable documents with each lot</li>
              <li>Packaging, export documentation, freight and customs handled</li>
              <li>FOB, CFR or CIF terms available</li>
            </ul>
          </div>
          <div className="card">
            <EnquiryForm kind="quote" defaultCommodity={commodity} />
          </div>
        </div>
      </section>
    </>
  );
}
