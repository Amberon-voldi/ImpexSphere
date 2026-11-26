import type { Metadata } from "next";
import CtaBand from "@/components/CtaBand";
import { phases, site, verticals } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description: "ImpexSphere is built by SP International Private Limited to make cross-border commodity trade transparent and reliable.",
};

const problems: [string, string][] = [
  ["Supplier information is scattered across brokers, markets and contacts", "One network of verified supplier profiles and product listings"],
  ["Current prices and stock are hard to get", "Listings suppliers must update when price, stock or specifications change"],
  ["Verified quality documentation is scarce", "Lab reports and traceable quality documents attached to each lot"],
  ["Cross-border trade is operationally complex", "Sourcing, export execution and logistics under one roof"],
  ["Small suppliers lack export registrations and expertise", "We buy domestically and export under our own name"],
];

export default function AboutPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <span className="eyebrow">About ImpexSphere</span>
          <h1>A commodity marketplace built from real trade</h1>
          <p className="lead">
            ImpexSphere is the trading and sourcing platform of{" "}
            <a href={site.companyUrl} target="_blank" rel="noopener noreferrer">{site.company}</a>. We start as an
            order-backed exporter of Indian spices, and every shipment adds a verified supplier to a network that
            becomes a global B2B commodity marketplace.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Why we exist</span>
            <h2>Fixing what slows commodity trade down</h2>
          </div>
          <div className="table-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th>The problem today</th>
                  <th>What ImpexSphere offers</th>
                </tr>
              </thead>
              <tbody>
                {problems.map(([a, b]) => (
                  <tr key={a}>
                    <td>{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">What we do</span>
            <h2>Trading is the engine</h2>
            <p className="lead">Every trade adds a known supplier and buyer to the network the other three services depend on.</p>
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

      <section className="section">
        <div className="container split">
          <div>
            <span className="eyebrow">Where we&apos;re going</span>
            <h2>Each phase builds on the last</h2>
            <p className="lead">
              We open the marketplace only once the network built through trading is genuinely useful, and add paid
              tiers only when they deliver measurable value.
            </p>
          </div>
          <ol className="roadmap">
            {phases.map((p, i) => (
              <li key={p.title}>
                <span className="ph">Phase {i + 1}</span>
                <div>
                  <strong>{p.title}</strong>
                  <span>{p.body}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
