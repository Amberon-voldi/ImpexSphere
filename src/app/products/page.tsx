import type { Metadata } from "next";
import Link from "next/link";
import CtaBand from "@/components/CtaBand";
import { moreCommodities, products } from "@/lib/content";

export const metadata: Metadata = {
  title: "Products",
  description: "Export-grade Indian turmeric, red chilli, cumin and other spices, with typical specifications.",
};

export default function ProductsPage() {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <span className="eyebrow">Products</span>
          <h1>Export-grade Indian spices</h1>
          <p className="lead">
            Sourced from India&apos;s major growing regions and inspected against your specification before shipment.
            Lab reports are available with every lot.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-3">
            {products.map((p) => (
              <article key={p.slug} id={p.slug} className="card product" style={{ scrollMarginTop: 96 }}>
                <span className="origin">{p.origin}</span>
                <h2 style={{ fontSize: "1.6rem" }}>{p.name}</h2>
                <p>{p.summary}</p>
                <div className="chips">
                  {p.forms.map((f) => (
                    <span key={f} className="chip">{f}</span>
                  ))}
                </div>
                <table className="specs">
                  <tbody>
                    {p.specs.map(([k, v]) => (
                      <tr key={k}>
                        <th scope="row">{k}</th>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Link href={`/buyers?commodity=${encodeURIComponent(p.name)}#quote`} className="btn btn-primary">
                  Request a quote
                </Link>
              </article>
            ))}
          </div>
          <p className="note" style={{ marginTop: 24 }}>
            Specifications shown are typical ranges. Final grade, purity, moisture, packing and labelling are agreed per order.
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Also available on request</span>
            <h2>More commodities</h2>
            <p className="lead">We add categories based on buyer demand and supplier availability. Ask us about:</p>
          </div>
          <div className="chips">
            {moreCommodities.map((c) => (
              <span key={c} className="chip" style={{ fontSize: "0.95rem", padding: "8px 16px" }}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
