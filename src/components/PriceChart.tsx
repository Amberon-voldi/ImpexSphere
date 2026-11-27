"use client";

import { motion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { inr, pct } from "@/lib/format";

const RANGES = { "7D": 7, "30D": 30, "60D": 60 } as const;

export default function PriceChart({ history }: { history: { p: number; d: string }[] }) {
  const id = useId().replace(/:/g, "");
  const [range, setRange] = useState<keyof typeof RANGES>("30D");
  const [hover, setHover] = useState<number | null>(null);
  const data = useMemo(() => history.slice(-RANGES[range]), [history, range]);
  const W = 600;
  const H = 220;
  if (data.length < 2) return null;

  const min = Math.min(...data.map((x) => x.p));
  const max = Math.max(...data.map((x) => x.p));
  const pad = (max - min) * 0.15 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const X = (i: number) => (i / (data.length - 1)) * W;
  const Y = (p: number) => H - ((p - lo) / (hi - lo)) * H;
  const d = data.map((x, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(x.p).toFixed(1)}`).join(" ");
  const first = data[0].p;
  const last = data[data.length - 1].p;
  const up = last >= first;
  const c = up ? "var(--up)" : "var(--down)";
  const h = hover !== null ? data[hover] : null;
  const shown = h ?? data[data.length - 1];

  return (
    <div className="card chart">
      <div className="chart-head">
        <div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>
            {h ? new Date(h.d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Indicative price, ₹/kg"}
          </div>
          <div className="big">{inr(shown.p)}</div>
          <div className={`mono ${up ? "up" : "down"}`} style={{ fontSize: "0.85rem" }}>
            {pct(((shown.p - first) / first) * 100)} over {range}
          </div>
        </div>
        <div className="seg" role="group" aria-label="Range">
          {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
            <button key={r} aria-pressed={range === r} onClick={() => setRange(r)} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
              {range === r && <motion.span layoutId={`rng${id}`} className="seg-pill" />}
              {r}
            </button>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Price history over ${range}: from ${inr(first)} to ${inr(last)} per kg`}
      >
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c} stopOpacity="0.3" />
            <stop offset="1" stopColor={c} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        ))}
        <motion.path key={`a${range}`} d={`${d} L${W} ${H} L0 ${H}Z`} fill={`url(#g${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
        <motion.path
          key={`l${range}`}
          d={d}
          fill="none"
          stroke={c}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        {h && hover !== null && (
          <>
            <line x1={X(hover)} x2={X(hover)} y1="0" y2={H} stroke="rgba(255,255,255,0.25)" vectorEffect="non-scaling-stroke" />
            <circle cx={X(hover)} cy={Y(h.p)} r="5" fill={c} stroke="var(--bg)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
    </div>
  );
}
