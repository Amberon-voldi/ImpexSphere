import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import MarketplaceBrowser from "@/components/MarketplaceBrowser";
import { SplitWords, Reveal } from "@/components/fx";
import { getActiveListings, getCategories, safe } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Marketplace",
  description: "Live offers for Indian spices and agricultural commodities from verified suppliers.",
};

export default async function MarketplacePage() {
  const [l, c] = await Promise.all([safe(getActiveListings, []), safe(getCategories, [])]);
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <span>Marketplace</span>
          </nav>
          <h1>
            <SplitWords text="The marketplace." />
          </h1>
          <Reveal delay={0.2}>
            <p className="lead">
              Indicative ex-warehouse prices from verified Indian suppliers, updated as stock and markets move.
              Shortlist offers to compare, or request a firm quote in one click.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="section-sm" style={{ paddingTop: 10 }}>
        <div className="container">
          {l.error ? (
            <div className="notice">Live listings are temporarily unavailable. Please refresh in a moment.</div>
          ) : (
            <Suspense>
              <MarketplaceBrowser listings={l.data} categories={c.data} />
            </Suspense>
          )}
        </div>
      </section>
    </>
  );
}
