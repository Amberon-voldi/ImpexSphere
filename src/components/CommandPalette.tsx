"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { inr } from "@/lib/format";
import Icon from "./Icon";
import { useApp } from "./Providers";

type Index = {
  listings: { slug: string; title: string; price: number; origin: string; category: string; hue: string; supplier: string }[];
  suppliers: { slug: string; name: string; city: string; state: string; level: string }[];
  categories: { slug: string; name: string; hue: string; count: number }[];
};

type Item = { key: string; group: string; title: string; sub: string; right?: string; href: string; hue?: string; badge: string };

const pages: Item[] = [
  { key: "p-m", group: "Go to", title: "Browse marketplace", sub: "All live listings", href: "/marketplace", badge: "→" },
  { key: "p-r", group: "Go to", title: "Post a buying request", sub: "Get offers from verified suppliers", href: "/rfq#post", badge: "+" },
  { key: "p-s", group: "Go to", title: "Supplier directory", sub: "Verified Indian suppliers", href: "/suppliers", badge: "◎" },
  { key: "p-l", group: "Go to", title: "Sell on ImpexSphere", sub: "List your commodities", href: "/sell", badge: "₹" },
  { key: "p-c", group: "Go to", title: "Contact the trade desk", sub: "Talk to a person", href: "/contact", badge: "@" },
];

export default function CommandPalette() {
  const { palette, setPalette } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState<Index | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!palette) return;
    setQ("");
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 30);
    if (!idx) {
      fetch("/api/search")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setIdx(d))
        .catch(() => {});
    }
  }, [palette, idx]);

  const results = useMemo<Item[]>(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const match = (s: string) => terms.every((t) => s.toLowerCase().includes(t));
    const out: Item[] = [];
    if (idx) {
      for (const c of idx.categories)
        if (!terms.length || match(c.name))
          out.push({ key: `c-${c.slug}`, group: "Categories", title: c.name, sub: `${c.count} live listings`, href: `/marketplace?category=${c.slug}`, hue: c.hue, badge: c.name[0] });
      for (const l of idx.listings)
        if (terms.length && match(`${l.title} ${l.origin} ${l.category} ${l.supplier}`))
          out.push({ key: `l-${l.slug}`, group: "Listings", title: l.title, sub: `${l.supplier} · ${l.origin}`, right: `${inr(l.price)}/kg`, href: `/marketplace/${l.slug}`, hue: l.hue, badge: l.category[0] });
      for (const s of idx.suppliers)
        if (terms.length && match(`${s.name} ${s.city} ${s.state}`))
          out.push({ key: `s-${s.slug}`, group: "Suppliers", title: s.name, sub: `${s.city}, ${s.state}`, href: `/suppliers/${s.slug}`, badge: s.name[0] });
    }
    for (const p of pages) if (!terms.length || match(`${p.title} ${p.sub}`)) out.push(p);
    if (terms.length)
      out.push({ key: "q", group: "Search", title: `Search marketplace for “${q}”`, sub: "Full results with filters", href: `/marketplace?q=${encodeURIComponent(q)}`, badge: "⌕" });
    return out.slice(0, 40);
  }, [q, idx]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (it?: Item) => {
    if (!it) return;
    setPalette(false);
    router.push(it.href);
  };

  let lastGroup = "";
  return (
    <AnimatePresence>
      {palette && (
        <>
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPalette(false)} />
          <motion.div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Search ImpexSphere"
            initial={{ opacity: 0, scale: 0.96, y: -12, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.97, y: -8, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setPalette(false);
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[active]);
              }
            }}
          >
            <div className="palette-input">
              <Icon name="search" size={20} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search turmeric, Guntur, cumin 99%, suppliers…"
                aria-label="Search"
              />
              <kbd>esc</kbd>
            </div>
            <div className="palette-list" ref={listRef}>
              {!idx && <div className="palette-group">Loading index…</div>}
              {results.map((r, i) => {
                const header = r.group !== lastGroup ? <div className="palette-group">{r.group}</div> : null;
                lastGroup = r.group;
                return (
                  <div key={r.key}>
                    {header}
                    <div
                      className="palette-item"
                      data-i={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(r)}
                      role="option"
                      aria-selected={active === i}
                    >
                      {active === i && <motion.div layoutId="pal-hl" className="hl" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                      <div className="ic" style={{ background: r.hue ?? "var(--gold)" }}>
                        {r.badge}
                      </div>
                      <div>
                        <div className="t">{r.title}</div>
                        <div className="s">{r.sub}</div>
                      </div>
                      {r.right && <div className="r">{r.right}</div>}
                    </div>
                  </div>
                );
              })}
              {idx && !results.length && <div className="empty">No matches. Try a commodity or a city.</div>}
            </div>
            <div className="palette-foot">
              <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
              <span><kbd>↵</kbd> open</span>
              <span><kbd>⌘</kbd> <kbd>K</kbd> toggle</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
