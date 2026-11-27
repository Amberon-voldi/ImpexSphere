"use client";

import { animate, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { destinations } from "@/lib/content";
import { inr, qty, usdMt, USD_INR } from "@/lib/format";
import { ContactFields, Field, LeadForm } from "./forms";
import { HeartButton } from "./ListingCard";
import type { ShortItem } from "./Providers";

function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const c = animate(prev.current, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => ref.current && (ref.current.textContent = format(v)),
    });
    prev.current = value;
    return () => c.stop();
  }, [value, format]);
  return <span ref={ref}>{format(value)}</span>;
}

const fmtInr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const fmtUsd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default function QuotePanel({ item, signedIn }: { item: ShortItem; signedIn?: boolean }) {
  const max = Math.max(item.moqKg * 20, item.stockKg);
  const [kg, setKg] = useState(Math.min(item.moqKg * 2, item.stockKg));
  const [open, setOpen] = useState(false);
  const total = kg * item.price;

  return (
    <div className="card quote-panel" id="quote" style={{ scrollMarginTop: 100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
        <div>
          <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 6 }}>Indicative ex-warehouse</div>
          <div className="price">
            {inr(item.price)}
            <small className="muted" style={{ fontSize: "0.9rem", fontWeight: 500 }}>/kg</small>
          </div>
          <div className="mono muted" style={{ fontSize: "0.85rem", marginTop: 6 }}>≈ {usdMt(item.price)} / MT</div>
        </div>
        <HeartButton item={item} />
      </div>

      <div className="calc">
        <label htmlFor="qty-range">
          <span>Order quantity</span>
          <b className="mono" style={{ color: "var(--ink)" }}>{qty(kg)}</b>
        </label>
        <input
          id="qty-range"
          className="range"
          type="range"
          min={item.moqKg}
          max={Math.min(max, item.stockKg)}
          step={item.moqKg >= 1000 ? 500 : 100}
          value={kg}
          onChange={(e) => setKg(Number(e.target.value))}
        />
        <div className="range-val">
          <span>MOQ {qty(item.moqKg)}</span>
          <span>{qty(item.stockKg)} available</span>
        </div>
        <div className="total">
          <span className="muted">Estimated value</span>
          <div style={{ textAlign: "right" }}>
            <b>
              <AnimatedNumber value={total} format={fmtInr} />
            </b>
            <div className="mono muted" style={{ fontSize: "0.8rem" }}>
              ≈ <AnimatedNumber value={total / USD_INR} format={fmtUsd} />
            </div>
          </div>
        </div>
      </div>

      {!open ? (
        <motion.button className="btn btn-gold btn-lg btn-block" onClick={() => setOpen(true)} whileTap={{ scale: 0.97 }}>
          Request firm quote →
        </motion.button>
      ) : (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}>
          <LeadForm kind="listing_quote" hidden={{ listing: item.slug, quantity: qty(kg) }} submitLabel="Send quote request">
            <ContactFields />
            <div className="form-row">
              <div className="field">
                <label htmlFor="f-country">Destination</label>
                <input id="f-country" name="country" list="dest-list" required placeholder="Port or country" />
                <datalist id="dest-list">
                  {destinations.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
              <Field name="incoterm" label="Incoterm" optional options={item.incoterms.length ? item.incoterms : ["FOB", "CIF"]} />
            </div>
            <Field name="message" label="Notes" optional textarea placeholder="Packing, certifications, sample request…" />
            <p className="fine">Quantity: {qty(kg)} (change it with the slider above).</p>
          </LeadForm>
        </motion.div>
      )}
      {!signedIn && (
        <p className="fine" style={{ marginTop: 14 }}>
          <a href={`/login?next=/marketplace/${item.slug}`} className="link">Sign in</a> or <a href="/signup" className="link">create a free account</a> to chat with the supplier and track their quote.
        </p>
      )}
      <p className="fine" style={{ marginTop: 14 }}>
        Prices are indicative and confirmed on quotation. Exports run on a confirmed order and advance payment.
      </p>
    </div>
  );
}
