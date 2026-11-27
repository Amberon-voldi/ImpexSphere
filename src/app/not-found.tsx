import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section" style={{ textAlign: "center" }}>
      <div className="container">
        <div className="footer-word" style={{ margin: "0 0 20px", fontSize: "clamp(6rem, 22vw, 14rem)" }}>404</div>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
          This lot has <span className="serif gold-text">shipped.</span>
        </h1>
        <p className="lead" style={{ margin: "0 auto 28px" }}>The page or listing you&apos;re looking for isn&apos;t available any more.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/marketplace" className="btn btn-gold">Browse the marketplace</Link>
          <Link href="/" className="btn">Home</Link>
        </div>
      </div>
    </section>
  );
}
