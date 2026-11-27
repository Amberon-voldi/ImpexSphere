"use client";

import { motion } from "motion/react";
import { useId } from "react";

export default function Sparkline({ data, className = "spark", up }: { data: number[]; className?: string; up?: boolean }) {
  const id = useId().replace(/:/g, "");
  const W = 96;
  const H = 34;
  if (data.length < 2) return <svg className={className} viewBox={`0 0 ${W} ${H}`} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - 3 - ((v - min) / span) * (H - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const isUp = up ?? data[data.length - 1] >= data[0];
  const c = isUp ? "var(--up)" : "var(--down)";
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <defs>
        <linearGradient id={`sg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.35" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={`${d} L${W} ${H} L0 ${H}Z`}
        fill={`url(#sg${id})`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: 0.6 }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={c}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.circle
        cx={lx}
        cy={ly}
        r="2.6"
        fill={c}
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.3 }}
      />
    </svg>
  );
}
