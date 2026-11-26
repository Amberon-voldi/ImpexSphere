"use client";

import { useState, type FormEvent } from "react";
import { moreCommodities, products } from "@/lib/content";

export type EnquiryKind = "quote" | "supplier" | "contact";

const commodityOptions = [...products.map((p) => p.name), ...moreCommodities, "Other"];

const submitLabel: Record<EnquiryKind, string> = {
  quote: "Send quote request",
  supplier: "Register interest",
  contact: "Send message",
};

export default function EnquiryForm({
  kind,
  defaultCommodity,
}: {
  kind: EnquiryKind;
  defaultCommodity?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState("sending");
    setError("");
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...data }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      form.reset();
      setState("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("err");
    }
  }

  if (state === "ok") {
    return (
      <div className="form-status ok" role="status">
        Thank you. Your {kind === "supplier" ? "registration" : "enquiry"} has been received and our
        trade desk will get back to you shortly.
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate={false}>
      <div className="form-row">
        <Field name="name" label="Full name" required autoComplete="name" />
        <Field name="company" label="Company" required autoComplete="organization" />
      </div>
      <div className="form-row">
        <Field name="email" label="Work email" type="email" required autoComplete="email" />
        <Field name="phone" label="Phone / WhatsApp" type="tel" optional autoComplete="tel" />
      </div>

      {kind !== "contact" && (
        <div className="form-row">
          <div className="field">
            <label htmlFor={`${kind}-commodity`}>Commodity</label>
            <select id={`${kind}-commodity`} name="commodity" required defaultValue={defaultCommodity ?? ""}>
              <option value="" disabled>
                Select a commodity
              </option>
              {commodityOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          {kind === "quote" ? (
            <Field name="country" label="Destination country" required autoComplete="country-name" />
          ) : (
            <Field name="location" label="Location (city, state)" required />
          )}
        </div>
      )}

      {kind === "quote" && (
        <div className="form-row">
          <Field name="quantity" label="Quantity (MT)" required placeholder="e.g. 20 MT / 1×20′ FCL" />
          <div className="field">
            <label htmlFor="quote-incoterm">
              Incoterm <span className="opt">(optional)</span>
            </label>
            <select id="quote-incoterm" name="incoterm" defaultValue="">
              <option value="">Not sure yet</option>
              <option>FOB</option>
              <option>CIF</option>
              <option>CFR</option>
              <option>EXW</option>
            </select>
          </div>
        </div>
      )}

      {kind === "supplier" && (
        <div className="form-row">
          <Field name="capacity" label="Monthly capacity (MT)" required placeholder="e.g. 50 MT" />
          <div className="field">
            <label htmlFor="supplier-service">Interested in</label>
            <select id="supplier-service" name="service" required defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              <option>Selling to ImpexSphere for export (export enablement)</option>
              <option>Logistics &amp; trade support for my own exports</option>
              <option>Listing on the marketplace</option>
              <option>Not sure — advise me</option>
            </select>
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor={`${kind}-message`}>
          {kind === "quote"
            ? "Specification & notes"
            : kind === "supplier"
              ? "Products, grades & certifications"
              : "Message"}
          {kind !== "contact" && <span className="opt"> (optional)</span>}
        </label>
        <textarea
          id={`${kind}-message`}
          name="message"
          required={kind === "contact"}
          placeholder={
            kind === "quote"
              ? "Grade, purity, packing, target price, delivery window…"
              : kind === "supplier"
                ? "Grades you supply, MOQ, lab reports available, export registrations (IEC, APEDA, Spices Board)…"
                : "How can we help?"
          }
        />
      </div>

      {/* Honeypot for bots */}
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${kind}-website`}>Website</label>
        <input id={`${kind}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {state === "err" && (
        <div className="form-status err" role="alert">
          {error}
        </div>
      )}

      <div>
        <button className="btn btn-primary" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : submitLabel[kind]}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  optional,
  placeholder,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional && <span className="opt"> (optional)</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  );
}
