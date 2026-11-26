import type { Metadata } from "next";
import EnquiryForm from "@/components/EnquiryForm";

export const metadata: Metadata = {
  title: "For Suppliers",
  description: "Export enablement, logistics support and marketplace access for Indian spice and commodity suppliers.",
};

const rows: [string, string, string][] = [
  ["Who it serves", "Suppliers without export registrations, infrastructure or expertise", "Suppliers with their own export documents and overseas buyers"],
  ["Seller & exporter", "ImpexSphere, in its own name", "You, the supplier"],
  ["How it works", "We buy your goods in a genuine domestic sale, then export them", "We coordinate the shipment on your behalf"],
  ["Overseas buyer relationship", "Managed by ImpexSphere", "Stays with you"],
  ["How we earn", "Trading margin", "Agreed service fee"],
  ["Scope", "Sourcing, buyer management, export operations", "Packaging, freight, documentation, customs brokers and forwarders"],
];

export default function SuppliersPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <span className="eyebrow">For suppliers</span>
          <h1>Take your produce to global buyers</h1>
          <p className="lead">
            For Indian producers, processors, manufacturers, wholesalers and traders. Whether or not you export today,
            there&apos;s a way to work with us.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Two ways to export</span>
            <h2>Export enablement or logistics support</h2>
            <p className="lead">The difference is simple: who is the seller and exporter.</p>
          </div>
          <div className="table-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th></th>
                  <th>Export enablement</th>
                  <th>Logistics &amp; trade support</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([k, a, b]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note" style={{ marginTop: 16 }}>
            Both services are subject to applicable legal, tax, customs and product-specific requirements for each commodity and destination.
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">What we look for</span>
            <h2>Becoming a verified supplier</h2>
          </div>
          <div className="grid grid-3">
            <div className="card">
              <span className="badge">1</span>
              <h3>Consistent quality</h3>
              <p>Product that meets agreed specifications lot after lot, with lab reports where available.</p>
            </div>
            <div className="card">
              <span className="badge">2</span>
              <h3>Accurate information</h3>
              <p>Up-to-date prices, available quantities and minimum order sizes, updated whenever they change.</p>
            </div>
            <div className="card">
              <span className="badge">3</span>
              <h3>Reliable delivery</h3>
              <p>Ability to deliver contracted quantities on time for inspection, packing and shipment.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="register" style={{ scrollMarginTop: 72 }}>
        <div className="container split">
          <div>
            <span className="eyebrow">Register your interest</span>
            <h2>Join the ImpexSphere supplier network</h2>
            <p className="lead">
              Tell us what you produce and where. Suppliers who trade with us are the first to be listed when the
              ImpexSphere marketplace opens.
            </p>
            <ul className="checklist">
              <li>Access overseas demand without export overheads</li>
              <li>Paid in a genuine, documented domestic transaction</li>
              <li>Early, verified listing on the marketplace</li>
            </ul>
          </div>
          <div className="card">
            <EnquiryForm kind="supplier" />
          </div>
        </div>
      </section>
    </>
  );
}
