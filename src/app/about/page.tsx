import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Reveal, SplitWords, Stagger, StaggerItem, Tilt } from "@/components/fx";
import { ScrollSteps } from "@/components/home";
import { phases, site, tradeSteps, verticals } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description: "ImpexSphere is built by SP International Private Limited to make cross-border commodity trade transparent and reliable.",
};

const problems: [string, string][] = [
  ["Supplier information is scattered across brokers, markets and contacts", "One network of verified supplier profiles and live listings"],
  ["Current prices and stock are hard to get", "Listings suppliers update when price, stock or specifications change"],
  ["Verified quality documentation is scarce", "Lab reports and traceable quality documents attached to each lot"],
  ["Cross-border trade is operationally complex", "Sourcing, export execution and logistics under one roof"],
  ["Small suppliers lack export registrations and expertise", "We buy domestically and export under our own name"],
];

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <span>About</span>
          </nav>
          <h1>
            <SplitWords text="A marketplace built" />
            <span className="line"><span className="serif gold-text">from real trade.</span></span>
          </h1>
          <Reveal delay={0.3}>
            <p className="lead">
              ImpexSphere is the trading and sourcing marketplace of{" "}
              <a href={site.companyUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)" }}>
                {site.company}
              </a>
              . We started as an order-backed exporter of Indian spices, and every shipment adds a verified
              supplier to the network behind this marketplace.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="eyebrow">Why we exist</span>
              <h2>Fixing what slows commodity trade down.</h2>
            </Reveal>
          </div>
          <Stagger className="rfq-list" gap={0.06}>
            {problems.map(([a, b]) => (
              <StaggerItem key={a}>
                <div className="card rfq-item spot" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
                  <span className="muted">{a}</span>
                  <span style={{ color: "var(--gold)" }}><Icon name="arrow" /></span>
                  <span>{b}</span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="eyebrow">What we do</span>
              <h2>Trading is the engine.</h2>
              <p>Every trade adds a known supplier and buyer to the network the other three services depend on.</p>
            </Reveal>
          </div>
          <Stagger className="vert-grid">
            {verticals.map((v) => (
              <StaggerItem key={v.key}>
                <Tilt className="card vert" max={6}>
                  <span className="k">{v.key}</span>
                  <h3>{v.title}</h3>
                  <p>{v.body}</p>
                </Tilt>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container steps-wrap">
          <div className="steps-sticky">
            <Reveal>
              <span className="eyebrow">How an export runs</span>
              <h2>Eight steps, <span className="serif gold-text">no shortcuts.</span></h2>
              <p className="lead">100% advance by default, 40–50% when negotiated. Procurement starts only after funds arrive.</p>
            </Reveal>
          </div>
          <ScrollSteps steps={tradeSteps} />
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="eyebrow">Roadmap</span>
              <h2>Each phase builds on the last.</h2>
              <p>We add paid tiers only when they deliver measurable value.</p>
            </Reveal>
          </div>
          <Stagger className="phases">
            {phases.map((p) => (
              <StaggerItem key={p.title} className="card phase">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}
