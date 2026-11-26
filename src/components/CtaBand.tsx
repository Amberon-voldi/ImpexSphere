import Link from "next/link";

export default function CtaBand() {
  return (
    <section className="section-tight section-dark">
      <div className="container cta-band">
        <div>
          <h2>Ready to trade?</h2>
          <p className="lead">Tell us what you need, or what you supply. Our trade desk will get back to you.</p>
        </div>
        <div className="btn-row">
          <Link href="/buyers#quote" className="btn btn-gold">Request a quote</Link>
          <Link href="/suppliers#register" className="btn btn-ghost">Become a supplier</Link>
        </div>
      </div>
    </section>
  );
}
