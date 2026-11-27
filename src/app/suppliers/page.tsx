import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Reveal, SplitWords, Stagger, StaggerItem, Tilt } from "@/components/fx";
import { levelLabel } from "@/lib/format";
import { getSuppliers, safe } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Suppliers",
  description: "Verified Indian spice and commodity suppliers on ImpexSphere.",
};

export default async function SuppliersPage() {
  const { data, error } = await safe(getSuppliers, []);
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <span>Suppliers</span>
          </nav>
          <h1>
            <SplitWords text="Verified at the source." />
          </h1>
          <Reveal delay={0.2}>
            <p className="lead">
              Growers, processors and traders from India&apos;s spice belts, checked before they list and while they
              trade. <b>Trusted partners</b> have a trading record with us; <b>verified</b> suppliers have passed
              document and facility checks.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="section-sm" style={{ paddingTop: 10 }}>
        <div className="container">
          {error && <div className="notice">Suppliers are temporarily unavailable. Please refresh in a moment.</div>}
          <Stagger className="supplier-grid" gap={0.05}>
            {data.map((s) => (
              <StaggerItem key={s.slug}>
                <Tilt className="card scard" max={4}>
                  <div className="head">
                    <span className="avatar" style={{ background: s.hues[0] ?? "var(--gold)" }}>
                      {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h3>
                        <Link href={`/suppliers/${s.slug}`}>{s.name}</Link>
                      </h3>
                      <div className="muted" style={{ fontSize: "0.86rem" }}>
                        <Icon name="pin" size={12} /> {s.city}, {s.state}
                        {s.sinceYear ? ` · since ${s.sinceYear}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="tags">
                    <span className={`badge badge-${s.level}`}>
                      {s.level !== "listed" && <Icon name="shield" size={11} stroke={2.4} />} {levelLabel[s.level]}
                    </span>
                    {s.isSample && <span className="badge badge-sample">Sample</span>}
                  </div>
                  <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>{s.about}</p>
                  <div className="mini-stats">
                    <div><b>{s.listingCount}</b><span>Offers</span></div>
                    <div><b>{s.rating?.toFixed(1) ?? "—"}</b><span>Rating</span></div>
                    <div><b>{s.responseHours ? `${s.responseHours}h` : "—"}</b><span>Response</span></div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                    <span className="muted" style={{ fontSize: "0.82rem" }}>{s.categories.join(" · ")}</span>
                    <span className="hues">
                      {s.hues.map((h) => (
                        <i key={h} style={{ background: h }} />
                      ))}
                    </span>
                  </div>
                </Tilt>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}
