import Link from "next/link";
import { inr, pct } from "@/lib/format";
import type { CardListing } from "@/lib/types";
import { Marquee } from "./fx";

export default function Ticker({ listings }: { listings: CardListing[] }) {
  if (!listings.length) return null;
  return (
    <div className="ticker" aria-label="Live indicative prices">
      <div className="ticker-label">
        <span className="live-dot" /> Live
      </div>
      <Marquee duration={Math.max(40, listings.length * 4)}>
        {listings.map((l) => (
          <Link key={l.slug} href={`/marketplace/${l.slug}`} className="tick">
            <span style={{ width: 8, height: 8, borderRadius: 2, background: l.category.hue }} />
            <span className="name">{l.title}</span>
            <span className="price">{inr(l.price)}</span>
            <span className={`chg ${l.change >= 0 ? "up" : "down"}`}>
              {l.change >= 0 ? "▲" : "▼"} {pct(l.change)}
            </span>
          </Link>
        ))}
      </Marquee>
    </div>
  );
}
