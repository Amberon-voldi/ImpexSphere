"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { destinations, incoterms } from "@/lib/content";
import type { CategoryInfo } from "@/lib/types";
import Icon from "./Icon";
import { Success } from "./forms";

type Data = Record<string, string>;
const STEPS = ["What you need", "Quantity & delivery", "Your details", "Review"];

export default function RfqWizard({ categories, initialCommodity = "" }: { categories: CategoryInfo[]; initialCommodity?: string }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [d, setD] = useState<Data>({ commodity: initialCommodity, incoterm: "CIF" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const set = (k: string, v: string) => setD((x) => ({ ...x, [k]: v }));

  const go = (n: number) => {
    setError("");
    if (n > step && formRef.current && !formRef.current.reportValidity()) return;
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  async function submit() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      setRef(body.ref);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  if (ref)
    return (
      <div className="card wizard">
        <Success title={`Request ${ref} received`}>
          Our trade desk will review it and match it with verified suppliers. You&apos;ll get offers by email, usually
          within one working day.
        </Success>
      </div>
    );

  const input = (k: string, label: string, opts: { optional?: boolean; type?: string; placeholder?: string; list?: string; autoComplete?: string } = {}) => (
    <div className="field">
      <label htmlFor={`rfq-${k}`}>
        {label} {opts.optional && <span className="opt">(optional)</span>}
      </label>
      <input
        id={`rfq-${k}`}
        type={opts.type ?? "text"}
        required={!opts.optional}
        value={d[k] ?? ""}
        onChange={(e) => set(k, e.target.value)}
        placeholder={opts.placeholder}
        list={opts.list}
        autoComplete={opts.autoComplete}
      />
    </div>
  );

  return (
    <div className="card wizard">
      <div className="wizard-steps" aria-hidden>
        {STEPS.map((s, i) => (
          <div key={s}>
            <motion.span initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        ))}
      </div>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) go(step + 1);
          else submit();
        }}
      >
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 50, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: dir * -50, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="form"
          >
            <div>
              <div className="step-n">
                Step {step + 1} of {STEPS.length}
              </div>
              <h3>{STEPS[step]}</h3>
            </div>

            {step === 0 && (
              <>
                <div className="choice-grid">
                  {categories.map((c) => (
                    <button
                      type="button"
                      key={c.slug}
                      className="choice"
                      aria-pressed={d.category === c.slug}
                      style={{ ["--c" as string]: c.hue }}
                      onClick={() => {
                        set("category", d.category === c.slug ? "" : c.slug);
                        if (!d.commodity) set("commodity", c.name);
                      }}
                    >
                      <span className="sw" />
                      {c.name}
                    </button>
                  ))}
                </div>
                {input("commodity", "Commodity & grade", { placeholder: "e.g. Turmeric fingers, 3% curcumin" })}
                <div className="field">
                  <label htmlFor="rfq-specs">
                    Specifications <span className="opt">(optional)</span>
                  </label>
                  <textarea id="rfq-specs" value={d.specs ?? ""} onChange={(e) => set("specs", e.target.value)} placeholder="Moisture, purity, packing, certifications, MRL requirements…" />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="form-row">
                  {input("quantity", "Quantity", { placeholder: "e.g. 2 × 20' FCL or 40 MT" })}
                  {input("destination", "Destination port / country", { placeholder: "e.g. Rotterdam, Netherlands", list: "rfq-dest" })}
                  <datalist id="rfq-dest">
                    {destinations.map((x) => (
                      <option key={x} value={x} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label>Incoterm</label>
                  <div className="seg" role="group" aria-label="Incoterm" style={{ alignSelf: "flex-start", flexWrap: "wrap" }}>
                    {incoterms.map((t) => (
                      <button type="button" key={t} aria-pressed={d.incoterm === t} onClick={() => set("incoterm", t)} style={{ padding: "8px 16px" }}>
                        {d.incoterm === t && <motion.span layoutId="inco" className="seg-pill" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-row">
                  {input("targetPrice", "Target price", { optional: true, placeholder: "e.g. USD 1,650 / MT" })}
                  {input("deliveryBy", "Needed by", { optional: true, placeholder: "e.g. Within 45 days" })}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="form-row">
                  {input("name", "Full name", { autoComplete: "name" })}
                  {input("company", "Company", { autoComplete: "organization" })}
                </div>
                <div className="form-row">
                  {input("email", "Work email", { type: "email", autoComplete: "email" })}
                  {input("phone", "Phone / WhatsApp", { optional: true, type: "tel", autoComplete: "tel" })}
                </div>
                <p className="fine">Your contact details are never shown publicly. Suppliers see the request, not who posted it.</p>
              </>
            )}

            {step === 3 && (
              <dl className="review">
                {[
                  ["Commodity", d.commodity],
                  ["Category", categories.find((c) => c.slug === d.category)?.name],
                  ["Specs", d.specs],
                  ["Quantity", d.quantity],
                  ["Destination", d.destination],
                  ["Incoterm", d.incoterm],
                  ["Target price", d.targetPrice],
                  ["Needed by", d.deliveryBy],
                  ["Contact", `${d.name} · ${d.company}`],
                  ["Email", d.email],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} style={{ display: "contents" }}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="form-error" role="alert" style={{ marginTop: 14 }}>
            {error}
          </div>
        )}

        <div className="wizard-nav">
          <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)} style={{ visibility: step ? "visible" : "hidden" }}>
            ← Back
          </button>
          <button type="submit" className="btn btn-gold" disabled={sending}>
            {step < 3 ? (
              <>
                Continue <Icon name="arrow" size={16} className="arrow" />
              </>
            ) : sending ? (
              "Posting…"
            ) : (
              <>
                Post request <Icon name="arrow" size={16} className="arrow" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
