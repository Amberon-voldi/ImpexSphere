"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { inr, levelLabel, qty, usdMt } from "@/lib/format";
import CommodityArt from "./CommodityArt";
import Icon from "./Icon";
import { useApp, type ShortItem } from "./Providers";

export default function ShortlistDrawer() {
  const { drawer, setDrawer, items, remove, clear } = useApp();
  const [mode, setMode] = useState<"list" | "compare">("list");

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, setDrawer]);

  const minPrice = Math.min(...items.map((i) => i.price));
  const minMoq = Math.min(...items.map((i) => i.moqKg));
  const minLead = Math.min(...items.map((i) => i.leadTimeDays));
  const rows: [string, (i: ShortItem) => React.ReactNode][] = [
    ["Price", (i) => <span className={i.price === minPrice ? "best" : ""}>{inr(i.price)}/kg</span>],
    ["≈ USD", (i) => `${usdMt(i.price)}/MT`],
    ["Category", (i) => i.category.name],
    ["Form", (i) => i.form],
    ["Origin", (i) => i.origin],
    ["MOQ", (i) => <span className={i.moqKg === minMoq ? "best" : ""}>{qty(i.moqKg)}</span>],
    ["Available", (i) => qty(i.stockKg)],
    ["Lead time", (i) => <span className={i.leadTimeDays === minLead ? "best" : ""}>{i.leadTimeDays} days</span>],
    ["Incoterms", (i) => i.incoterms.join(", ")],
    ["Lab report", (i) => (i.labReport ? "Yes" : "On request")],
    ["Supplier", (i) => i.supplier.name],
    ["Status", (i) => levelLabel[i.supplier.level]],
  ];

  return (
    <AnimatePresence>
      {drawer && (
        <>
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
          <motion.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Shortlist"
            initial={{ x: "110%" }}
            animate={{ x: 0, width: mode === "compare" && items.length > 1 ? "min(980px, calc(100vw - 20px))" : "min(460px, calc(100vw - 20px))" }}
            exit={{ x: "110%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
          >
            <div className="drawer-head">
              <div>
                <h3>Shortlist</h3>
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  {items.length} {items.length === 1 ? "listing" : "listings"} saved on this device
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {items.length > 1 && (
                  <div className="seg">
                    {(["list", "compare"] as const).map((m) => (
                      <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)} title={m === "list" ? "List" : "Compare"}>
                        {mode === m && <motion.span layoutId="sl-seg" className="seg-pill" />}
                        <Icon name={m === "list" ? "list" : "compare"} size={16} />
                      </button>
                    ))}
                  </div>
                )}
                <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close shortlist">
                  <Icon name="close" />
                </button>
              </div>
            </div>
            <div className="drawer-body">
              {!items.length && (
                <div className="empty">
                  <div className="big">♡</div>
                  Tap the heart on any listing to shortlist it, then compare offers side by side.
                </div>
              )}
              {mode === "compare" && items.length > 1 ? (
                <div className="compare">
                  <table>
                    <thead>
                      <tr>
                        <th />
                        {items.map((i) => (
                          <td key={i.slug}>
                            <Link href={`/marketplace/${i.slug}`} onClick={() => setDrawer(false)} style={{ fontWeight: 700 }}>
                              {i.title}
                            </Link>
                          </td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(([label, fn]) => (
                        <tr key={label}>
                          <th>{label}</th>
                          {items.map((i) => (
                            <td key={i.slug}>{fn(i)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((i) => (
                    <motion.div
                      key={i.slug}
                      layout
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 60, height: 0, marginBottom: -10 }}
                      className="sl-item"
                    >
                      <div className="thumb">
                        <CommodityArt hue={i.category.hue} shape={i.category.shape} seed={i.slug} density={0.5} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <Link href={`/marketplace/${i.slug}`} className="t" onClick={() => setDrawer(false)}>
                          {i.title}
                        </Link>
                        <div className="s">
                          <span className="mono">{inr(i.price)}/kg</span> · MOQ {qty(i.moqKg)} · {i.supplier.name}
                        </div>
                      </div>
                      <button className="icon-btn x" style={{ width: 34, height: 34 }} onClick={() => remove(i.slug)} aria-label={`Remove ${i.title}`}>
                        <Icon name="close" size={15} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
            {items.length > 0 && (
              <div className="drawer-foot">
                <button className="btn btn-ghost" onClick={clear}>
                  <Icon name="trash" size={16} /> Clear
                </button>
                <Link
                  className="btn btn-gold"
                  style={{ flex: 1 }}
                  onClick={() => setDrawer(false)}
                  href={`/rfq?commodity=${encodeURIComponent(items.map((i) => i.title).join("; "))}#post`}
                >
                  Request quotes for all <Icon name="arrow" className="arrow" />
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
