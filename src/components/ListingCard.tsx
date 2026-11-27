"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { inr, levelLabel, pct, qty, usdMt } from "@/lib/format";
import type { CardListing } from "@/lib/types";
import CommodityArt from "./CommodityArt";
import { spotlight } from "./fx";
import Icon from "./Icon";
import { useApp, type ShortItem } from "./Providers";
import Sparkline from "./Sparkline";

export function toShort(l: CardListing): ShortItem {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { spark, views, updatedAt, ...rest } = l;
  return rest;
}

export function HeartButton({ item, label }: { item: ShortItem; label?: string }) {
  const { has, toggle } = useApp();
  const on = has(item.slug);
  const [burst, setBurst] = useState(0);
  return (
    <motion.button
      className="heart-btn"
      aria-pressed={on}
      aria-label={label ?? (on ? `Remove ${item.title} from shortlist` : `Shortlist ${item.title}`)}
      whileTap={{ scale: 0.8 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (toggle(item)) setBurst((b) => b + 1);
      }}
    >
      <motion.span key={on ? "on" : "off"} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }} style={{ display: "grid" }}>
        <Icon name="heart" size={16} />
      </motion.span>
      <AnimatePresence>
        {burst > 0 &&
          Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <motion.span
                key={`${burst}-${i}`}
                className="burst"
                initial={{ x: -2.5, y: -2.5, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(a) * 26 - 2.5, y: Math.sin(a) * 26 - 2.5, opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                onAnimationComplete={() => i === 9 && setBurst(0)}
              />
            );
          })}
      </AnimatePresence>
    </motion.button>
  );
}

export default function ListingCard({ l, priority }: { l: CardListing; priority?: boolean }) {
  const initials = l.supplier.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <article className="card lcard spot" onPointerMove={spotlight} style={{ ["--c" as string]: l.category.hue }} data-priority={priority ? "" : undefined}>
      <div className="media">
        <CommodityArt hue={l.category.hue} shape={l.category.shape} seed={l.slug} />
        <div className="badges">
          {l.featured && <span className="badge badge-featured">Featured</span>}
          {l.labReport && (
            <span className="badge badge-verified">
              <Icon name="flask" size={11} stroke={2.4} /> Lab report
            </span>
          )}
          {l.isSample && <span className="badge badge-sample">Sample</span>}
        </div>
        <div className="heart">
          <HeartButton item={toShort(l)} />
        </div>
      </div>
      <div className="body">
        <div className="info">
          <div className="cat">{l.category.name}</div>
          <h3>
            <Link href={`/marketplace/${l.slug}`}>{l.title}</Link>
          </h3>
          <div className="sub">
            {l.form} · {l.origin}
          </div>
        </div>
        <div className="price-row">
          <div>
            <div className="price">
              {inr(l.price)}
              <small>/kg</small>
            </div>
            <div className="usd">
              ≈ {usdMt(l.price)}/MT · <span className={l.change >= 0 ? "up" : "down"}>{pct(l.change)}</span>
            </div>
          </div>
          <Sparkline data={l.spark} />
        </div>
        <div className="facts">
          <div>
            <span>MOQ</span>
            <b>{qty(l.moqKg)}</b>
          </div>
          <div>
            <span>Stock</span>
            <b>{qty(l.stockKg)}</b>
          </div>
          <div>
            <span>Lead</span>
            <b>{l.leadTimeDays}d</b>
          </div>
        </div>
        <div className="supplier">
          <div className="who">
            <span className="avatar" style={{ background: l.category.hue }}>
              {initials}
            </span>
            <span>{l.supplier.name}</span>
          </div>
          <span className={`badge badge-${l.supplier.level}`}>
            {l.supplier.level !== "listed" && <Icon name="shield" size={11} stroke={2.4} />}
            {levelLabel[l.supplier.level]}
          </span>
        </div>
      </div>
    </article>
  );
}
