"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { incoterms } from "@/lib/content";
import Icon from "./Icon";

export type LeadKind = "listing_quote" | "rfq_offer" | "supplier_application" | "contact";

export function Success({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.div className="success" role="status" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <div style={{ position: "relative", width: 72, margin: "0 auto" }}>
        <svg className="check" viewBox="0 0 72 72">
          <motion.circle cx="36" cy="36" r="33" fill="none" stroke="var(--up)" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }} />
          <motion.path d="M22 37l10 10 19-21" fill="none" stroke="var(--up)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.5 }} />
        </svg>
        {Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * Math.PI * 2;
          const d = 60 + (i % 3) * 22;
          return (
            <motion.span
              key={i}
              style={{ position: "absolute", left: 33, top: 33, width: 6, height: i % 2 ? 6 : 10, borderRadius: 2, background: ["var(--gold)", "var(--up)", "var(--gold-2)"][i % 3] }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d + 20, opacity: 0, rotate: 360 }}
              transition={{ delay: 0.6, duration: 1.1, ease: "easeOut" }}
            />
          );
        })}
      </div>
      <h3>{title}</h3>
      <p className="muted">{children}</p>
    </motion.div>
  );
}

export function Field({
  name,
  label,
  type = "text",
  optional,
  textarea,
  options,
  defaultValue,
  placeholder,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  optional?: boolean;
  textarea?: boolean;
  options?: string[];
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {optional && <span className="opt">(optional)</span>}
      </label>
      {textarea ? (
        <textarea id={id} name={name} required={!optional} defaultValue={defaultValue} placeholder={placeholder} />
      ) : options ? (
        <select id={id} name={name} required={!optional} defaultValue={defaultValue ?? ""}>
          <option value="" disabled={!optional}>
            {optional ? "No preference" : "Select…"}
          </option>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input id={id} name={name} type={type} required={!optional} defaultValue={defaultValue} placeholder={placeholder} autoComplete={autoComplete} />
      )}
    </div>
  );
}

const thanks: Record<LeadKind, [string, string]> = {
  listing_quote: ["Quote request sent", "Our trade desk will confirm a firm price, availability and terms, usually within one working day."],
  rfq_offer: ["Offer received", "We'll review your offer and put you in touch with the buyer if it's a match."],
  supplier_application: ["Application received", "Our team will review your details and reach out to start verification."],
  contact: ["Message sent", "Thanks for getting in touch. We'll reply shortly."],
};

/** Shared lead form for quotes, RFQ offers, supplier applications and contact. */
export function LeadForm({
  kind,
  hidden,
  children,
  submitLabel,
}: {
  kind: LeadKind;
  hidden?: Record<string, string>;
  children: ReactNode;
  submitLabel: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "ok">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...hidden, ...data }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      setState("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("idle");
    }
  }

  if (state === "ok") return <Success title={thanks[kind][0]}>{thanks[kind][1]}</Success>;

  return (
    <form className="form" onSubmit={onSubmit}>
      {children}
      <div className="hp" aria-hidden>
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <AnimatePresence>
        {error && (
          <motion.div className="form-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      <button className="btn btn-gold btn-lg btn-block" disabled={state === "sending"}>
        {state === "sending" ? (
          <>
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} style={{ display: "inline-block", width: 16, height: 16, border: "2px solid currentColor", borderRightColor: "transparent", borderRadius: "50%" }} />
            Sending…
          </>
        ) : (
          <>
            {submitLabel} <Icon name="arrow" size={16} className="arrow" />
          </>
        )}
      </button>
    </form>
  );
}

export function ContactFields({ phone = true }: { phone?: boolean }) {
  return (
    <>
      <div className="form-row">
        <Field name="name" label="Full name" autoComplete="name" />
        <Field name="company" label="Company" autoComplete="organization" />
      </div>
      <div className="form-row">
        <Field name="email" label="Work email" type="email" autoComplete="email" />
        {phone && <Field name="phone" label="Phone / WhatsApp" type="tel" optional autoComplete="tel" />}
      </div>
    </>
  );
}

export { incoterms };
