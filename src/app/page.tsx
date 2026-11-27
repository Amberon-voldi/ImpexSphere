import Link from "next/link";
import CommodityArt from "@/components/CommodityArt";
import Globe from "@/components/Globe";
import Icon from "@/components/Icon";
import ListingCard from "@/components/ListingCard";
import RfqItem from "@/components/RfqItem";
import Ticker from "@/components/Ticker";
import { Counter, Magnetic, Marquee, Reveal, RotatingWord, SplitWords, Stagger, StaggerItem, Tilt } from "@/components/fx";
import { FloatCards, HeroSearch, OrbitRings, ScrollSteps } from "@/components/home";
import { destinations, tradeSteps, trustPillars, verticals } from "@/lib/content";
import { inr } from "@/lib/format";
import { getActiveListings, getCategories, getOpenRfqs, getStats, safe } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [listingsR, catsR, rfqsR, statsR] = await Promise.all([
    safe(getActiveListings, []),
    safe(getCategories, []),
    safe(() => getOpenRfqs(4), []),
    safe(getStats, { listings: 0, suppliers: 0, rfqs: 0, stock: 0, states: 0 }),
  ]);
  const listings = listingsR.data;
  const cats = catsR.data.filter((c) => c.count > 0);
  const stats = statsR.data;
  const featured = [...listings].sort((a, b) => Number(b.featured) - Number(a.featured) || b.views - a.views).slice(0, 8);
  const movers = [...listings].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const dbDown = listingsR.error;

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <Reveal y={10}>
              <span className="eyebrow">
                <span className="live-dot" /> Live B2B marketplace · {stats.suppliers} suppliers · {stats.listings} offers
              </span>
            </Reveal>
            <h1>
              <SplitWords text="Source India's" />
              <span className="line">
                <span className="serif gold-text">
                  <RotatingWord words={["turmeric", "chillies", "cumin", "cardamom", "pepper", "coriander"]} />
                </span>
              </span>
              <SplitWords text="verified end to end." delay={0.25} />
            </h1>
            <Reveal delay={0.5}>
              <p className="lead">
                Compare live offers from verified Indian growers and processors, check lab reports before you
                enquire, and trade with an exporter that ships only against confirmed orders.
              </p>
            </Reveal>
            <Reveal delay={0.65}>
              <HeroSearch />
              <div className="hero-tags">
                <span className="muted">Popular:</span>
                {cats.slice(0, 5).map((c) => (
                  <Link key={c.slug} href={`/marketplace?category=${c.slug}`} className="chip chip-dot" style={{ ["--c" as string]: c.hue }}>
                    {c.name}
                  </Link>
                ))}
              </div>
            </Reveal>
          </div>
          <div className="hero-visual">
            <Globe />
            <FloatCards
              items={movers.slice(0, 3).map((l) => ({
                title: l.title,
                price: l.price,
                change: l.change,
                origin: l.origin,
                href: `/marketplace/${l.slug}`,
                hue: l.category.hue,
              }))}
            />
          </div>
        </div>
        <div className="scroll-cue" aria-hidden>
          <span className="mouse" />
          Scroll
        </div>
      </section>

      <Ticker listings={movers} />

      {dbDown && (
        <div className="container" style={{ marginTop: 30 }}>
          <div className="notice">Live marketplace data is temporarily unavailable. Please refresh in a moment.</div>
        </div>
      )}

      {/* STATS */}
      <section className="section-sm">
        <div className="container">
          <Reveal>
            <div className="stats">
              <div className="stat">
                <div className="num"><Counter to={stats.listings} /></div>
                <div className="lbl">Live offers</div>
              </div>
              <div className="stat">
                <div className="num"><Counter to={Math.round(stats.stock)} suffix={<small>MT</small>} /></div>
                <div className="lbl">Stock on offer</div>
              </div>
              <div className="stat">
                <div className="num"><Counter to={stats.suppliers} /></div>
                <div className="lbl">Suppliers across {stats.states} states</div>
              </div>
              <div className="stat">
                <div className="num"><Counter to={stats.rfqs} /></div>
                <div className="lbl">Open buying requests</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CATEGORIES */}
      {cats.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <Reveal>
                <span className="eyebrow">Categories</span>
                <h2>
                  Every grade, <span className="serif gold-text">every origin.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <Link href="/marketplace" className="btn">
                  All categories <Icon name="arrow" size={16} className="arrow" />
                </Link>
              </Reveal>
            </div>
            <Stagger className="cat-grid">
              {cats.slice(0, 7).map((c, i) => (
                <StaggerItem key={c.slug} className="cat-tile-wrap" >
                  <Link href={`/marketplace?category=${c.slug}`} style={{ display: "contents" }}>
                    <Tilt className={`card cat-tile cat-${i}`} max={5}>
                      <CommodityArt hue={c.hue} shape={c.shape} seed={c.slug} density={i === 0 ? 1.4 : 1} />
                      <div className="shade" />
                      <span className="chip" style={{ alignSelf: "flex-start", backdropFilter: "blur(8px)" }}>
                        {c.count} offers{c.minPrice ? ` · from ${inr(c.minPrice)}/kg` : ""}
                      </span>
                      <div className="meta">
                        <div>
                          <h3>{c.name}</h3>
                          <p>{c.blurb}</p>
                        </div>
                        <span className="go"><Icon name="arrowUpRight" /></span>
                      </div>
                    </Tilt>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <Reveal>
                <span className="eyebrow">Trending offers</span>
                <h2>Fresh on the floor.</h2>
                <p>Indicative ex-warehouse prices from verified suppliers. Shortlist offers to compare them side by side.</p>
              </Reveal>
              <Reveal delay={0.1}>
                <Link href="/marketplace" className="btn">
                  Browse all {stats.listings} <Icon name="arrow" size={16} className="arrow" />
                </Link>
              </Reveal>
            </div>
            <Stagger className="listing-grid" gap={0.06}>
              {featured.map((l) => (
                <StaggerItem key={l.slug}>
                  <ListingCard l={l} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* RFQs */}
      {rfqsR.data.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container two-col">
            <Reveal>
              <span className="eyebrow">Buying requests</span>
              <h2>
                Buyers are asking. <span className="serif gold-text">Right now.</span>
              </h2>
              <p className="lead">
                Importers post what they need, we match them with verified suppliers. Post yours and get offers,
                or send an offer on an open request.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
                <Magnetic>
                  <Link href="/rfq#post" className="btn btn-gold btn-lg">
                    Post a buying request <Icon name="arrow" size={16} className="arrow" />
                  </Link>
                </Magnetic>
                <Link href="/rfq" className="btn btn-lg btn-ghost">
                  See all {stats.rfqs}
                </Link>
              </div>
            </Reveal>
            <Stagger className="rfq-list">
              {rfqsR.data.map((r) => (
                <StaggerItem key={r.ref}>
                  <RfqItem r={r} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="container steps-wrap">
          <div className="steps-sticky">
            <Reveal>
              <span className="eyebrow">Order-backed trade</span>
              <h2>
                We buy only after <span className="serif gold-text">you&apos;ve ordered.</span>
              </h2>
              <p className="lead">
                Every export runs on a confirmed order and an advance. No speculative stock, no surprises: eight
                steps from enquiry to settlement, each one inspected and documented.
              </p>
              <Link href="/about" className="btn" style={{ marginTop: 10 }}>
                How we work <Icon name="arrow" size={16} className="arrow" />
              </Link>
            </Reveal>
          </div>
          <ScrollSteps steps={tradeSteps} />
        </div>
      </section>

      {/* VERTICALS */}
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="eyebrow">One platform</span>
              <h2>Four ways to trade.</h2>
            </Reveal>
          </div>
          <Stagger className="vert-grid">
            {verticals.map((v) => (
              <StaggerItem key={v.key}>
                <Tilt className="card vert" max={6}>
                  <span className="k">{v.key}</span>
                  <h3>{v.title}</h3>
                  <p>{v.body}</p>
                </Tilt>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* TRUST */}
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <Stagger className="trust-grid">
            {trustPillars.map((t, i) => (
              <StaggerItem key={t.title}>
                <Tilt className="card trust" max={5}>
                  <div className="ic"><Icon name={["shield", "bolt", "flask"][i]} size={22} /></div>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                </Tilt>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* DESTINATIONS */}
      <section className="section-sm">
        <Reveal>
          <p className="container eyebrow" style={{ display: "flex", justifyContent: "center" }}>Shipping to</p>
        </Reveal>
        <div className="countries">
          <Marquee duration={50}>
            {destinations.map((d) => (
              <span key={d} className="country">{d}</span>
            ))}
          </Marquee>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="cta">
              <OrbitRings />
              <span className="eyebrow">Start trading</span>
              <h2>
                Your next container of spice is <span className="serif gold-text">one request away.</span>
              </h2>
              <p>Tell us the grade, quantity and port. Verified suppliers respond with offers, usually within a day.</p>
              <div className="actions">
                <Magnetic>
                  <Link href="/rfq#post" className="btn btn-gold btn-lg">
                    Post a buying request <Icon name="arrow" size={16} className="arrow" />
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link href="/sell" className="btn btn-lg">
                    List as a supplier
                  </Link>
                </Magnetic>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
