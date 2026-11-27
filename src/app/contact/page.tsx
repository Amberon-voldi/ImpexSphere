import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { ContactFields, Field, LeadForm } from "@/components/forms";
import { Reveal, SplitWords } from "@/components/fx";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the ImpexSphere trade desk.",
};

export default function ContactPage() {
  return (
    <section className="page-hero">
      <div className="container two-col">
        <div>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <span>Contact</span>
          </nav>
          <h1>
            <SplitWords text="Talk to the" />
            <span className="line"><span className="serif gold-text">trade desk.</span></span>
          </h1>
          <Reveal delay={0.3}>
            <p className="lead">
              Questions about a grade, a shipment or how we work? Send a message and a person will reply.
            </p>
            <div className="rfq-list" style={{ marginTop: 26 }}>
              <Link href="/rfq#post" className="card rfq-item spot">
                <div>
                  <h3>Need a price?</h3>
                  <span className="muted">Post a buying request and get offers from verified suppliers.</span>
                </div>
                <Icon name="arrowUpRight" />
              </Link>
              <Link href="/sell#apply" className="card rfq-item spot">
                <div>
                  <h3>Want to sell?</h3>
                  <span className="muted">Apply to list your commodities on the marketplace.</span>
                </div>
                <Icon name="arrowUpRight" />
              </Link>
              <a href={site.companyUrl} target="_blank" rel="noopener noreferrer" className="card rfq-item spot">
                <div>
                  <h3>{site.company}</h3>
                  <span className="muted">The company behind ImpexSphere.</span>
                </div>
                <Icon name="arrowUpRight" />
              </a>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.15}>
          <div className="card panel">
            <LeadForm kind="contact" submitLabel="Send message">
              <ContactFields />
              <Field name="message" label="Message" textarea />
            </LeadForm>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
