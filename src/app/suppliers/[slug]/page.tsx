import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import Icon from "@/components/Icon";
import ListingCard from "@/components/ListingCard";
import { Counter, Reveal, Stagger, StaggerItem } from "@/components/fx";
import { levelLabel } from "@/lib/format";
import { getSupplier as load } from "@/lib/queries";

export const dynamic = "force-dynamic";
const getSupplier = cache(load);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await getSupplier((await params).slug).catch(() => null);
  return s ? { title: s.name, description: s.about } : { title: "Supplier" };
}

export default async function SupplierPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await getSupplier((await params).slug);
  if (!s) notFound();
  const hue = s.listings[0]?.category.hue ?? "#d9b56b";
  return (
    <>
      <section className="page-hero" style={{ paddingTop: 30 }}>
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <Link href="/suppliers">Suppliers</Link> / <span>{s.name}</span>
          </nav>
          <Reveal>
            <div className="card profile-hero" style={{ background: `radial-gradient(ellipse at 0% 0%, ${hue}22, transparent 60%), var(--panel)` }}>
              <span className="avatar" style={{ background: hue }}>
                {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <div>
                <div className="tags" style={{ marginBottom: 10 }}>
                  <span className={`badge badge-${s.level}`}>
                    {s.level !== "listed" && <Icon name="shield" size={11} stroke={2.4} />} {levelLabel[s.level]}
                  </span>
                  {s.isSample && <span className="badge badge-sample">Sample supplier</span>}
                </div>
                <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", margin: "0 0 6px" }}>{s.name}</h1>
                <div className="muted">
                  <Icon name="pin" size={13} /> {s.city}, {s.state}
                  {s.sinceYear ? ` · trading since ${s.sinceYear}` : ""}
                </div>
              </div>
              <Link href="#offers" className="btn btn-gold">
                See {s.listings.length} offers <Icon name="arrow" size={16} className="arrow" />
              </Link>
            </div>
          </Reveal>

          <div className="two-col" style={{ marginTop: 30 }}>
            <Reveal>
              <h2 style={{ fontSize: "1.3rem" }}>About</h2>
              <p style={{ color: "var(--ink-2)" }}>{s.about}</p>
              {s.capabilities.length > 0 && (
                <>
                  <h2 style={{ fontSize: "1.3rem", marginTop: 24 }}>Capabilities</h2>
                  <ul className="checklist">
                    {s.capabilities.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
            </Reveal>
            <Reveal delay={0.1}>
              <div className="stats" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="stat">
                  <div className="num"><Counter to={s.completedTrades} /></div>
                  <div className="lbl">Completed trades</div>
                </div>
                <div className="stat" style={{ borderRight: 0 }}>
                  <div className="num"><Counter to={s.rating ?? 0} decimals={1} suffix={<small>/5</small>} /></div>
                  <div className="lbl">Buyer rating</div>
                </div>
                <div className="stat" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="num">{s.responseHours ? <Counter to={s.responseHours} suffix={<small>h</small>} /> : "—"}</div>
                  <div className="lbl">Typical response</div>
                </div>
                <div className="stat" style={{ borderTop: "1px solid var(--line)", borderRight: 0 }}>
                  <div className="num"><Counter to={s.listings.length} /></div>
                  <div className="lbl">Live offers</div>
                </div>
              </div>
              {s.certifications.length > 0 && (
                <div className="tags" style={{ marginTop: 18 }}>
                  {s.certifications.map((c) => (
                    <span key={c} className="chip"><Icon name="shield" size={13} /> {c}</span>
                  ))}
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>
      <section className="section" id="offers" style={{ paddingTop: 30, scrollMarginTop: 80 }}>
        <div className="container">
          <div className="section-head">
            <Reveal>
              <span className="eyebrow">Live offers</span>
              <h2>From {s.name}</h2>
            </Reveal>
          </div>
          {s.listings.length ? (
            <Stagger className="listing-grid">
              {s.listings.map((l) => (
                <StaggerItem key={l.slug}>
                  <ListingCard l={l} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <div className="card empty">No live offers right now.</div>
          )}
        </div>
      </section>
    </>
  );
}
