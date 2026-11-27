"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { inr, pct } from "@/lib/format";
import Icon from "./Icon";
import { Magnetic } from "./fx";

const hints = ["Turmeric 3% curcumin…", "Teja chilli stemless…", "Cumin 99% Europe quality…", "Cardamom 8 mm bold…", "Black pepper 550 GL…"];

/** Hero search with a typewriter placeholder. */
export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [ph, setPh] = useState("");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPh(hints[0]);
      return;
    }
    let i = 0;
    let c = 0;
    let del = false;
    const t = setInterval(() => {
      const w = hints[i];
      c += del ? -1 : 1;
      setPh(w.slice(0, c));
      if (!del && c === w.length + 14) del = true;
      if (del && c <= 0) {
        del = false;
        i = (i + 1) % hints.length;
      }
    }, 70);
    return () => clearInterval(t);
  }, []);
  return (
    <form
      className="hero-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/marketplace${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
      }}
    >
      <Icon name="search" size={20} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ph || "Search"} aria-label="Search the marketplace" />
      <Magnetic strength={0.25}>
        <button className="btn btn-gold" type="submit">
          Search <Icon name="arrow" size={16} className="arrow" />
        </button>
      </Magnetic>
    </form>
  );
}

export type FloatItem = { title: string; price: number; change: number; origin: string; href: string; hue: string };

/** Glass cards orbiting the globe. */
export function FloatCards({ items }: { items: FloatItem[] }) {
  const pos = [
    { left: "-6%", top: "14%" },
    { right: "-4%", top: "38%" },
    { left: "4%", bottom: "8%" },
  ];
  return (
    <>
      {items.slice(0, 3).map((it, i) => (
        <motion.div
          key={it.href}
          className="float-card"
          style={pos[i]}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
          transition={{
            opacity: { delay: 1 + i * 0.25, duration: 0.6 },
            scale: { delay: 1 + i * 0.25, duration: 0.6 },
            y: { delay: 1.6 + i * 0.25, duration: 5 + i, repeat: Infinity, ease: "easeInOut" },
          }}
          whileHover={{ scale: 1.05 }}
        >
          <Link href={it.href}>
            <div className="fc-top">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="live-dot" /> Live offer
              </span>
              <span className={`mono ${it.change >= 0 ? "up" : "down"}`}>{pct(it.change)}</span>
            </div>
            <div className="fc-title">{it.title}</div>
            <div className="fc-route">
              <span style={{ width: 8, height: 8, borderRadius: 3, background: it.hue }} />
              {it.origin} · <b className="mono">{inr(it.price)}/kg</b>
            </div>
          </Link>
        </motion.div>
      ))}
    </>
  );
}

/** Steps with a rail that fills as you scroll. */
export function ScrollSteps({ steps }: { steps: { title: string; body: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 65%", "end 55%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const [on, setOn] = useState(-1);
  useEffect(() => scrollYProgress.on("change", (v) => setOn(Math.floor(v * steps.length - 0.0001))), [scrollYProgress, steps.length]);
  return (
    <div className="steps" ref={ref}>
      <div className="rail">
        <motion.span style={{ scaleY }} />
      </div>
      {steps.map((s, i) => (
        <motion.div
          key={s.title}
          className={`step${i <= on ? " on" : ""}`}
          animate={{ x: i === on ? 8 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="dot">{i + 1}</div>
          <h3>{s.title}</h3>
          <p>{s.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

/** Big closing call-to-action with expanding orbit rings. */
export function OrbitRings() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const s = useTransform(scrollYProgress, [0, 1], [0.6, 1.3]);
  return (
    <motion.div ref={ref} style={{ position: "absolute", inset: 0, scale: s, pointerEvents: "none" }} aria-hidden>
      {[400, 700, 1000, 1300].map((d) => (
        <div key={d} className="orbit" style={{ width: d, height: d }} />
      ))}
    </motion.div>
  );
}
