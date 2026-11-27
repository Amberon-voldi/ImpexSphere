import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CommodityArt from "@/components/CommodityArt";
import Icon from "@/components/Icon";
import ListingCard, { HeartButton } from "@/components/ListingCard";
import PriceChart from "@/components/PriceChart";
import QuotePanel from "@/components/QuotePanel";
import { Parallax, Reveal, Stagger, StaggerItem } from "@/components/fx";
import { ago, levelLabel, pct, qty } from "@/lib/format";
import { cache } from "react";
import { getListing as load } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";

// One load (and one view count) per request, shared by the metadata and the page.
const getListing = cache(load);

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const l = await getListing((await params).slug).catch(() => null);
  return l ? { title: `${l.title} from ${l.origin}`, description: l.summary } : { title: "Listing" };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const l = await getListing((await params).slug);
  if (!l) notFound();
  const s = l.supplierFull;
  const item = {
    id: l.id, slug: l.slug, title: l.title, form: l.form, origin: l.origin, grade: l.grade, price: l.price,
    moqKg: l.moqKg, stockKg: l.stockKg, leadTimeDays: l.leadTimeDays, incoterms: l.incoterms,
    certifications: l.certifications, labReport: l.labReport, featured: l.featured, isSample: l.isSample,
    change: l.change, supplier: l.supplier, category: l.category,
  };
  const initials = l.supplier.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <>
      <section className="page-hero" style={{ paddingTop: 30 }}>
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <Link href="/marketplace">Marketplace</Link> /{" "}
            <Link href={`/marketplace?category=${l.category.slug}`}>{l.category.name}</Link> / <span>{l.title}</span>
          </nav>
          <div className="detail">
            <div>
              <Reveal>
                <div className="detail-media">
                  <Parallax speed={0.15} className="art">
                    <CommodityArt hue={l.category.hue} shape={l.category.shape} seed={l.slug} density={1.6} />
                  </Parallax>
                  <div className="badges">
                    <span className="chip chip-dot" style={{ ["--c" as string]: l.category.hue, backdropFilter: "blur(8px)" }}>
                      {l.category.name}
                    </span>
                    {l.featured && <span className="badge badge-featured">Featured</span>}
                    {l.labReport && <span className="badge badge-verified"><Icon name="flask" size={11} stroke={2.4} /> Lab report</span>}
                    {l.isSample && <span className="badge badge-sample">Sample listing</span>}
                    {l.status !== "active" && <span className="badge badge-listed">{l.status.replace("_", " ")}</span>}
                  </div>
                  <div className="heart">
                    <HeartButton item={item} />
                  </div>
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <h1>{l.title}</h1>
                <p className="lead" style={{ maxWidth: "none" }}>{l.summary}</p>
                <div className="tags" style={{ margin: "18px 0 26px" }}>
                  <span className="chip"><Icon name="pin" size={13} /> {l.origin}</span>
                  <span className="chip"><Icon name="box" size={13} /> {l.form}</span>
                  <span className="chip"><Icon name="clock" size={13} /> Updated {ago(l.updatedAt)}</span>
                  <span className="chip">{l.views.toLocaleString("en-IN")} views</span>
                </div>
              </Reveal>
              <Reveal delay={0.15}>
                <div className="kv">
                  <div><span>MOQ</span><b className="mono">{qty(l.moqKg)}</b></div>
                  <div><span>Available</span><b className="mono">{qty(l.stockKg)}</b></div>
                  <div><span>Dispatch</span><b className="mono">{l.leadTimeDays} days</b></div>
                  <div><span>60-day move</span><b className={`mono ${l.change >= 0 ? "up" : "down"}`}>{pct(l.change)}</b></div>
                  <div><span>Incoterms</span><b>{l.incoterms.join(" · ") || "On request"}</b></div>
                  <div><span>Packing</span><b>{l.packing || "On request"}</b></div>
                </div>
              </Reveal>

              <Reveal>
                <div className="block">
                  <h2>Price history</h2>
                  <PriceChart history={l.history} />
                </div>
              </Reveal>

              {l.specs.length > 0 && (
                <Reveal>
                  <div className="block">
                    <h2>Specification</h2>
                    <table className="spec-table">
                      <tbody>
                        {l.specs.map(([k, v]) => (
                          <tr key={k}><th>{k}</th><td>{v}</td></tr>
                        ))}
                        {l.grade && !l.specs.some(([, v]) => v === l.grade) && <tr><th>Grade</th><td>{l.grade}</td></tr>}
                        <tr><th>Lab report</th><td>{l.labReport ? "Available with each lot" : "On request"}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </Reveal>
              )}

              {l.certifications.length > 0 && (
                <Reveal>
                  <div className="block">
                    <h2>Certifications</h2>
                    <div className="tags">
                      {l.certifications.map((c) => (
                        <span key={c} className="chip"><Icon name="shield" size={13} /> {c}</span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )}

              <Reveal>
                <div className="block">
                  <h2>Supplier</h2>
                  <div className="card supplier-card spot">
                    <div className="head">
                      <span className="avatar" style={{ background: l.category.hue }}>{initials}</span>
                      <div style={{ flex: 1 }}>
                        <Link href={`/suppliers/${l.supplier.slug}`} style={{ fontWeight: 700, fontSize: "1.1rem" }}>{l.supplier.name}</Link>
                        <div className="muted" style={{ fontSize: "0.88rem" }}>{l.supplier.city}, {l.supplier.state}{s.sinceYear ? ` · since ${s.sinceYear}` : ""}</div>
                      </div>
                      <span className={`badge badge-${l.supplier.level}`}>
                        {l.supplier.level !== "listed" && <Icon name="shield" size={11} stroke={2.4} />}
                        {levelLabel[l.supplier.level]}
                      </span>
                    </div>
                    <p className="muted" style={{ margin: 0 }}>{s.about}</p>
                    <div className="mini-stats">
                      <div><b>{l.supplier.rating?.toFixed(1) ?? "—"}</b><span>Rating</span></div>
                      <div><b>{s.completedTrades}</b><span>Trades</span></div>
                      <div><b>{s.responseHours ? `${s.responseHours}h` : "—"}</b><span>Response</span></div>
                    </div>
                    <Link href={`/suppliers/${l.supplier.slug}`} className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
                      View all offers from this supplier <Icon name="arrow" size={14} className="arrow" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            </div>

            <QuotePanel item={item} signedIn={!!(await getCurrentUser())} />
          </div>
        </div>
      </section>

      {l.related.length > 0 && (
        <section className="section" style={{ paddingTop: 30 }}>
          <div className="container">
            <div className="section-head">
              <Reveal>
                <span className="eyebrow">Compare</span>
                <h2>More {l.category.name.toLowerCase()} offers</h2>
              </Reveal>
            </div>
            <Stagger className="listing-grid">
              {l.related.map((r) => (
                <StaggerItem key={r.slug}>
                  <ListingCard l={r} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}
    </>
  );
}
