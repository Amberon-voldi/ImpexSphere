import type { Metadata } from "next";
import Link from "next/link";
import EnquiryForm from "@/components/EnquiryForm";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the ImpexSphere trade desk.",
};

export default function ContactPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <span className="eyebrow">Contact</span>
          <h1>Talk to our trade desk</h1>
          <p className="lead">Questions about sourcing, supplying or partnering with us? Send a message.</p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div>
            <h2 style={{ fontSize: "1.6rem" }}>Looking for something specific?</h2>
            <ul className="checklist">
              <li>
                <strong>Buying?</strong> Use the <Link href="/buyers#quote">quote request form</Link> for faster pricing.
              </li>
              <li>
                <strong>Supplying?</strong> <Link href="/suppliers#register">Register as a supplier</Link> to join the network.
              </li>
              <li>
                <strong>Company:</strong>{" "}
                <a href={site.companyUrl} target="_blank" rel="noopener noreferrer">{site.company}</a>
              </li>
            </ul>
          </div>
          <div className="card">
            <EnquiryForm kind="contact" />
          </div>
        </div>
      </section>
    </>
  );
}
