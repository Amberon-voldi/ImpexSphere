import Link from "next/link";
import { nav, site } from "@/lib/content";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              ImpexSphere<span className="dot">.</span>
            </div>
            <p>{site.tagline}</p>
            <p>
              A platform of{" "}
              <a href={site.companyUrl} target="_blank" rel="noopener noreferrer">
                {site.company}
              </a>
              .
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href}>{n.label}</Link>
                </li>
              ))}
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Get started</h4>
            <ul>
              <li><Link href="/buyers#quote">Request a quote</Link></li>
              <li><Link href="/suppliers#register">Register as a supplier</Link></li>
              <li><Link href="/products">Browse commodities</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {site.company}. All rights reserved.</span>
          <span>Order-backed trade · Verified suppliers · Traceable quality</span>
        </div>
      </div>
    </footer>
  );
}
