"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { inr, levelLabel } from "@/lib/format";
import type { CardListing, CategoryInfo, Level } from "@/lib/types";
import Icon from "./Icon";
import ListingCard from "./ListingCard";

const SORTS = {
  relevance: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  moq: "Lowest MOQ",
  lead: "Fastest dispatch",
  movers: "Biggest movers",
  popular: "Most viewed",
} as const;
type Sort = keyof typeof SORTS;

const LEVELS: Level[] = ["trusted", "verified", "listed"];

export default function MarketplaceBrowser({ listings, categories }: { listings: CardListing[]; categories: CategoryInfo[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const maxPrice = Math.ceil(Math.max(100, ...listings.map((l) => l.price)) / 100) * 100;
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cats, setCats] = useState<string[]>(params.get("category")?.split(",").filter(Boolean) ?? []);
  const [origins, setOrigins] = useState<string[]>(params.get("origin")?.split(",").filter(Boolean) ?? []);
  const [levels, setLevels] = useState<Level[]>((params.get("level")?.split(",").filter(Boolean) as Level[]) ?? []);
  const [lab, setLab] = useState(params.get("lab") === "1");
  const [price, setPrice] = useState(Number(params.get("max")) || maxPrice);
  const [sort, setSort] = useState<Sort>((params.get("sort") as Sort) in SORTS ? (params.get("sort") as Sort) : "relevance");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sheet, setSheet] = useState(false);
  const dq = useDeferredValue(q);

  // Keep the URL in sync so filtered views can be shared.
  useEffect(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (cats.length) p.set("category", cats.join(","));
    if (origins.length) p.set("origin", origins.join(","));
    if (levels.length) p.set("level", levels.join(","));
    if (lab) p.set("lab", "1");
    if (price < maxPrice) p.set("max", String(price));
    if (sort !== "relevance") p.set("sort", sort);
    const s = p.toString();
    const t = setTimeout(() => router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false }), 250);
    return () => clearTimeout(t);
  }, [q, cats, origins, levels, lab, price, sort, maxPrice, pathname, router]);

  const originCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of listings) m.set(l.origin, (m.get(l.origin) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [listings]);

  const results = useMemo(() => {
    const terms = dq.toLowerCase().split(/\s+/).filter(Boolean);
    const out = listings.filter((l) => {
      if (cats.length && !cats.includes(l.category.slug)) return false;
      if (origins.length && !origins.includes(l.origin)) return false;
      if (levels.length && !levels.includes(l.supplier.level)) return false;
      if (lab && !l.labReport) return false;
      if (l.price > price) return false;
      if (terms.length) {
        const hay = `${l.title} ${l.form} ${l.origin} ${l.category.name} ${l.supplier.name} ${l.supplier.city} ${l.grade ?? ""}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    const by: Record<Sort, (a: CardListing, b: CardListing) => number> = {
      relevance: (a, b) => Number(b.featured) - Number(a.featured) || b.views - a.views,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      moq: (a, b) => a.moqKg - b.moqKg,
      lead: (a, b) => a.leadTimeDays - b.leadTimeDays,
      movers: (a, b) => Math.abs(b.change) - Math.abs(a.change),
      popular: (a, b) => b.views - a.views,
    };
    return out.sort(by[sort]);
  }, [listings, dq, cats, origins, levels, lab, price, sort]);

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const reset = () => {
    setQ("");
    setCats([]);
    setOrigins([]);
    setLevels([]);
    setLab(false);
    setPrice(maxPrice);
    setSort("relevance");
  };
  const activeCount = cats.length + origins.length + levels.length + (lab ? 1 : 0) + (price < maxPrice ? 1 : 0);

  const filters = (
    <aside className={`card filters${sheet ? " open" : ""}`} aria-label="Filters">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Filters</strong>
        {activeCount > 0 && (
          <button className="chip" onClick={reset}>
            Reset ({activeCount})
          </button>
        )}
        <button className="icon-btn filters-toggle" style={{ width: 34, height: 34 }} onClick={() => setSheet(false)} aria-label="Close filters">
          <Icon name="close" size={15} />
        </button>
      </div>
      <div>
        <h4>Category</h4>
        <div className="filter-list">
          {categories.filter((c) => c.count > 0).map((c) => (
            <button key={c.slug} className="filter-opt" aria-pressed={cats.includes(c.slug)} style={{ ["--c" as string]: c.hue }} onClick={() => toggle(cats, c.slug, setCats)}>
              <span className="box">{cats.includes(c.slug) && <Icon name="check" size={11} stroke={3} />}</span>
              {c.name}
              <span className="n">{c.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h4>Max price</h4>
        <input className="range" type="range" min={0} max={maxPrice} step={10} value={price} onChange={(e) => setPrice(Number(e.target.value))} aria-label="Maximum price per kg" />
        <div className="range-val">
          <span>₹0</span>
          <span style={{ color: "var(--ink)" }}>{price >= maxPrice ? "Any" : `≤ ${inr(price)}/kg`}</span>
        </div>
      </div>
      <div>
        <h4>Supplier status</h4>
        <div className="filter-list">
          {LEVELS.map((lv) => (
            <button key={lv} className="filter-opt" aria-pressed={levels.includes(lv)} onClick={() => toggle(levels, lv, setLevels)}>
              <span className="box">{levels.includes(lv) && <Icon name="check" size={11} stroke={3} />}</span>
              {levelLabel[lv]}
            </button>
          ))}
          <button className="filter-opt" aria-pressed={lab} onClick={() => setLab(!lab)}>
            <span className="box">{lab && <Icon name="check" size={11} stroke={3} />}</span>
            Lab report available
          </button>
        </div>
      </div>
      <div>
        <h4>Origin</h4>
        <div className="filter-list">
          {originCounts.map(([o, n]) => (
            <button key={o} className="filter-opt" aria-pressed={origins.includes(o)} onClick={() => toggle(origins, o, setOrigins)}>
              <span className="box">{origins.includes(o) && <Icon name="check" size={11} stroke={3} />}</span>
              {o}
              <span className="n">{n}</span>
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-gold filters-toggle" onClick={() => setSheet(false)}>
        Show {results.length} results
      </button>
    </aside>
  );

  return (
    <div className="market">
      {filters}
      {sheet && <div className="overlay" style={{ zIndex: 200 }} onClick={() => setSheet(false)} />}
      <div>
        <div className="toolbar">
          <label className="searchbox">
            <Icon name="search" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by commodity, grade, origin or supplier" aria-label="Search listings" />
            {q && (
              <button className="chip" onClick={() => setQ("")} aria-label="Clear search">
                <Icon name="close" size={12} />
              </button>
            )}
          </label>
          <button className="btn filters-toggle" onClick={() => setSheet(true)}>
            <Icon name="filter" size={16} /> Filters{activeCount ? ` (${activeCount})` : ""}
          </button>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <div className="seg hide-sm" role="group" aria-label="View">
            {(["grid", "list"] as const).map((v) => (
              <button key={v} aria-pressed={view === v} onClick={() => setView(v)} aria-label={`${v} view`}>
                {view === v && <motion.span layoutId="view-seg" className="seg-pill" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                <Icon name={v} size={16} />
              </button>
            ))}
          </div>
        </div>

        <div className="result-meta">
          <span>
            <motion.b key={results.length} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ display: "inline-block", color: "var(--ink)" }}>
              {results.length}
            </motion.b>{" "}
            of {listings.length} offers
          </span>
          <div className="active-filters">
            <AnimatePresence>
              {cats.map((c) => {
                const cat = categories.find((x) => x.slug === c);
                return (
                  <motion.button key={c} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="chip chip-dot" style={{ ["--c" as string]: cat?.hue }} onClick={() => toggle(cats, c, setCats)}>
                    {cat?.name ?? c} <Icon name="close" size={11} />
                  </motion.button>
                );
              })}
              {origins.map((o) => (
                <motion.button key={o} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="chip" onClick={() => toggle(origins, o, setOrigins)}>
                  <Icon name="pin" size={11} /> {o} <Icon name="close" size={11} />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <LayoutGroup>
          <motion.div layout className={`listing-grid${view === "list" ? " list" : ""}`}>
            <AnimatePresence mode="popLayout">
              {results.map((l, i) => (
                <motion.div
                  key={l.slug}
                  layout
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0, transition: { delay: Math.min(i, 12) * 0.03, type: "spring", stiffness: 260, damping: 28 } }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                >
                  <ListingCard l={l} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>

        {!results.length && (
          <motion.div className="card empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="big">⌕</div>
            <p>No offers match these filters.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn" onClick={reset}>
                Clear filters
              </button>
              <a className="btn btn-gold" href={`/rfq?commodity=${encodeURIComponent(q)}#post`}>
                Post a buying request instead
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
