import Link from "next/link";
import { site } from "@/lib/content";
import { Logo } from "./Header";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p className="about">
              {site.description}
            </p>
          </div>
          <div>
            <h4>Marketplace</h4>
            <ul>
              <li><Link href="/marketplace">Browse listings</Link></li>
              <li><Link href="/suppliers">Supplier directory</Link></li>
              <li><Link href="/rfq">Buying requests</Link></li>
              <li><Link href="/rfq#post">Post an RFQ</Link></li>
            </ul>
          </div>
          <div>
            <h4>Suppliers</h4>
            <ul>
              <li><Link href="/sell">Sell on ImpexSphere</Link></li>
              <li><Link href="/sell#apply">Apply to list</Link></li>
              <li><Link href="/about">How we verify</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><a href={site.companyUrl} target="_blank" rel="noopener noreferrer">{site.company}</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-word" aria-hidden>IMPEXSPHERE</div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {site.company}. All rights reserved.</span>
          <span>Prices shown are indicative and confirmed on quotation.</span>
        </div>
      </div>
    </footer>
  );
}
