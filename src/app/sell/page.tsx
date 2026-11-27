import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { ContactFields, Field, LeadForm } from "@/components/forms";
import { Reveal, SplitWords, Stagger, StaggerItem, Tilt } from "@/components/fx";
import { getCategories, safe } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sell on ImpexSphere",
  description: "List your spices and commodities, reach overseas buyers, and export even without an export licence.",
};

const perks = [
  { icon: "globe", title: "Reach importers worldwide", body: "Your offers appear to buyers in the Gulf, Europe, the Americas and Asia, with live prices and specs." },
  { icon: "ship", title: "Export without a licence", body: "We buy from you in a genuine domestic sale and export as seller of record. You get paid in rupees." },
  { icon: "doc", title: "Paperwork handled", body: "Packaging, freight, phytosanitary, COO, customs and banking coordinated by our trade desk." },
  { icon: "bolt", title: "Matched buying requests", body: "We route open RFQs that fit your grades and capacity straight to you." },
];

const checks = [
  "GST registration and company documents",
  "FSSAI licence and Spices Board registration where applicable",
  "Facility and processing capability (cleaning, sortex, grinding, storage)",
  "Lab reports for recent lots (moisture, purity, aflatoxin, pesticide residues)",
  "Trade references, or a trial lot with our trade desk",
];

export default async function SellPage() {
  const { data: cats } = await safe(getCategories, []);
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <span>Sell</span>
          </nav>
          <h1>
            <SplitWords text="Your harvest," />
            <span className="line"><span className="serif gold-text">the world&apos;s table.</span></span>
          </h1>
          <Reveal delay={0.3}>
            <p className="lead">
              List your spices and commodities on ImpexSphere. Whether you export already or have never shipped a
              container, we&apos;ll get your goods in front of serious buyers.
            </p>
            <Link href="#apply" className="btn btn-gold btn-lg" style={{ marginTop: 10 }}>
              Apply to list <Icon name="arrow" size={16} className="arrow" />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <Stagger className="vert-grid">
            {perks.map((p) => (
              <StaggerItem key={p.title}>
                <Tilt className="card trust" max={6}>
                  <div className="ic"><Icon name={p.icon} size={22} /></div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </Tilt>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section" id="apply" style={{ scrollMarginTop: 80 }}>
        <div className="container two-col">
          <Reveal>
            <span className="eyebrow">Verification</span>
            <h2>What we check.</h2>
            <p className="lead" style={{ marginBottom: 26 }}>
              Verification protects buyers and the suppliers who do things properly. Starting with suppliers we&apos;ve
              already traded with, every listing is reviewed before it goes live.
            </p>
            <ul className="checklist">
              {checks.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="card panel">
              <h3 style={{ fontSize: "1.4rem" }}>Apply to list</h3>
              <p className="muted" style={{ fontSize: "0.92rem" }}>Takes two minutes. Our team will reach out to start verification.</p>
              <LeadForm kind="supplier_application" submitLabel="Submit application">
                <ContactFields />
                <div className="form-row">
                  <Field name="commodity" label="Main commodity" options={[...cats.map((c) => c.name), "Other"]} />
                  <Field name="location" label="Location (city, state)" placeholder="e.g. Erode, Tamil Nadu" />
                </div>
                <div className="form-row">
                  <Field name="capacity" label="Monthly capacity" placeholder="e.g. 200 MT" />
                  <Field
                    name="service"
                    label="I'm looking for"
                    options={["Export enablement (no licence)", "Logistics & trade support", "Marketplace listing only"]}
                  />
                </div>
                <Field name="message" label="Anything else" optional textarea placeholder="Grades, certifications, current markets…" />
              </LeadForm>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
