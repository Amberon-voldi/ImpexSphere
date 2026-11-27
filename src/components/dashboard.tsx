"use client";

import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { quickUpdateListing, saveListing, sendRfqOffer, updateCompany } from "@/app/actions/supplier";
import { incoterms as INCOTERMS } from "@/lib/content";
import { inr, qty } from "@/lib/format";
import Icon from "./Icon";
import { FormMessage, SubmitButton } from "./ui";

type Cat = { slug: string; name: string; hue: string };

export type EditableListing = {
  id?: string;
  title?: string;
  category?: string;
  variety?: string | null;
  grade?: string | null;
  form?: string;
  origin?: string;
  summary?: string;
  price?: number;
  moqKg?: number;
  stockKg?: number;
  leadTimeDays?: number;
  packing?: string;
  incoterms?: string[];
  certifications?: string[];
  specs?: [string, string][];
  labReport?: boolean;
  status?: string;
};

const STATUSES = [
  ["active", "Active", "Visible to buyers"],
  ["draft", "Draft", "Only you can see it"],
  ["paused", "Paused", "Hidden from search, page shows paused"],
  ["sold_out", "Sold out", "Shown as sold out"],
] as const;

export function ListingEditor({ listing, categories, approved }: { listing: EditableListing; categories: Cat[]; approved: boolean }) {
  const [state, action] = useActionState(saveListing, undefined);
  const v = state?.values;
  const [specs, setSpecs] = useState<Spec[]>(() =>
    (listing.specs?.length ? listing.specs : [["Moisture", ""], ["Purity", ""]]).map(([k, val], i) => ({ id: i, k, v: val })),
  );
  const nextId = useRef(100);
  const [price, setPrice] = useState(String(v?.price ?? listing.price ?? ""));
  const [cat, setCat] = useState(v?.category ?? listing.category ?? "");
  const [status, setStatus] = useState(v?.status ?? listing.status ?? "active");
  const hue = categories.find((c) => c.slug === cat)?.hue ?? "var(--gold)";

  return (
    <form action={action} className="editor">
      {listing.id && <input type="hidden" name="id" value={listing.id} />}
      <div className="editor-main">
        <div className="card panel form">
          <h2>Basics</h2>
          <div className="field">
            <label htmlFor="l-title">Title</label>
            <input id="l-title" name="title" required maxLength={140} defaultValue={v?.title ?? listing.title} placeholder="e.g. Salem Finger Turmeric, 3.5% curcumin" />
          </div>
          <div className="field">
            <label>Category</label>
            <input type="hidden" name="category" value={cat} />
            <div className="choice-grid">
              {categories.map((c) => (
                <button type="button" key={c.slug} className="choice" aria-pressed={cat === c.slug} style={{ ["--c" as string]: c.hue }} onClick={() => setCat(c.slug)}>
                  <span className="sw" />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="l-form">Form</label>
              <input id="l-form" name="form" required defaultValue={v?.form ?? listing.form} placeholder="e.g. Whole, sortex / Powder" />
            </div>
            <div className="field">
              <label htmlFor="l-origin">Origin</label>
              <input id="l-origin" name="origin" required defaultValue={v?.origin ?? listing.origin} placeholder="e.g. Erode" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="l-variety">Variety <span className="opt">(optional)</span></label>
              <input id="l-variety" name="variety" defaultValue={v?.variety ?? listing.variety ?? ""} placeholder="e.g. Teja, Rajapuri" />
            </div>
            <div className="field">
              <label htmlFor="l-grade">Grade <span className="opt">(optional)</span></label>
              <input id="l-grade" name="grade" defaultValue={v?.grade ?? listing.grade ?? ""} placeholder="e.g. Europe quality 99%" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="l-summary">Description <span className="opt">(optional)</span></label>
            <textarea id="l-summary" name="summary" maxLength={1000} defaultValue={v?.summary ?? listing.summary} placeholder="What buyers should know about this lot." />
          </div>
        </div>

        <div className="card panel form">
          <h2>Price & availability</h2>
          <div className="form-row">
            <div className="field">
              <label htmlFor="l-price">Price (₹ per kg, ex-warehouse)</label>
              <input id="l-price" name="price" type="number" step="0.01" min="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="l-lead">Dispatch time (days)</label>
              <input id="l-lead" name="leadTime" type="number" min="0" max="365" required defaultValue={v?.leadTime ?? listing.leadTimeDays ?? 14} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="l-moq">Minimum order (kg)</label>
              <input id="l-moq" name="moq" type="number" min="1" required defaultValue={v?.moq ?? listing.moqKg ?? 1000} />
            </div>
            <div className="field">
              <label htmlFor="l-stock">Available stock (kg)</label>
              <input id="l-stock" name="stock" type="number" min="0" required defaultValue={v?.stock ?? listing.stockKg ?? ""} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="l-packing">Packing <span className="opt">(optional)</span></label>
            <input id="l-packing" name="packing" defaultValue={v?.packing ?? listing.packing} placeholder="e.g. 25 kg PP bags" />
          </div>
          <div className="field">
            <label>Incoterms offered</label>
            <div className="tags">
              {INCOTERMS.map((t) => (
                <label key={t} className="chip-check">
                  <input type="checkbox" name="incoterms" value={t} defaultChecked={listing.incoterms?.includes(t) ?? t === "FOB"} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="card panel form">
          <div className="panel-head">
            <h2>Specification</h2>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setSpecs((s) => [...s, { id: nextId.current++, k: "", v: "" }])}
              disabled={specs.length >= 15}
            >
              <Icon name="plus" size={14} /> Add row
            </button>
          </div>
          <p className="fine" style={{ marginTop: -6 }}>Drag rows to reorder. Empty rows are ignored.</p>
          <Reorder.Group axis="y" values={specs} onReorder={setSpecs} className="spec-rows">
            <AnimatePresence initial={false}>
              {specs.map((s) => (
                <SpecRow
                  key={s.id}
                  row={s}
                  onChange={(k, val) => setSpecs((all) => all.map((x) => (x.id === s.id ? { ...x, k, v: val } : x)))}
                  onRemove={() => setSpecs((all) => all.filter((x) => x.id !== s.id))}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
          <div className="field">
            <label htmlFor="l-certs">Certifications <span className="opt">(comma separated)</span></label>
            <input id="l-certs" name="certifications" defaultValue={v?.certifications ?? listing.certifications?.join(", ")} placeholder="e.g. FSSAI, Spices Board, Organic (NPOP)" />
          </div>
          <label className="check-row">
            <input type="checkbox" name="labReport" defaultChecked={listing.labReport} /> A lab report is available for this lot
          </label>
        </div>
      </div>

      <aside className="editor-side">
        <div className="card panel form" style={{ position: "sticky", top: 100 }}>
          <div className="preview" style={{ ["--c" as string]: hue }}>
            <span className="muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Buyers see</span>
            <motion.div key={price} initial={{ scale: 0.9, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="mono" style={{ fontSize: "2rem", fontWeight: 700 }}>
              {Number(price) > 0 ? inr(Number(price)) : "₹—"}
              <small className="muted" style={{ fontSize: "0.9rem" }}>/kg</small>
            </motion.div>
          </div>
          <div className="field">
            <label>Status</label>
            <input type="hidden" name="status" value={status} />
            <div className="status-list">
              {STATUSES.map(([k, t, d]) => (
                <button type="button" key={k} className="status-opt" aria-pressed={status === k} onClick={() => setStatus(k)}>
                  <span className={`dot dot-${k}`} />
                  <span>
                    <b>{t}</b>
                    <small>{d}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
          {!approved && status === "active" && <p className="fine">Your company is awaiting verification. Active listings go live once you&apos;re approved.</p>}
          <FormMessage state={state} />
          <SubmitButton pendingText="Saving…">
            {listing.id ? "Save changes" : "Publish listing"} <Icon name="arrow" size={16} className="arrow" />
          </SubmitButton>
          <Link href="/dashboard/listings" className="btn btn-ghost btn-block">Cancel</Link>
        </div>
      </aside>
    </form>
  );
}

type Spec = { id: number; k: string; v: string };

function SpecRow({ row, onChange, onRemove }: { row: Spec; onChange: (k: string, v: string) => void; onRemove: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={row} dragListener={false} dragControls={controls} className="spec-row" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
      <span className="grip" onPointerDown={(e) => controls.start(e)} aria-hidden>⋮⋮</span>
      <input name="specKey" placeholder="e.g. Moisture" value={row.k} onChange={(e) => onChange(e.target.value, row.v)} aria-label="Spec name" />
      <input name="specValue" placeholder="e.g. ≤ 10%" value={row.v} onChange={(e) => onChange(row.k, e.target.value)} aria-label="Spec value" />
      <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={onRemove} aria-label="Remove row">
        <Icon name="close" size={14} />
      </button>
    </Reorder.Item>
  );
}

export type RowListing = { id: string; slug: string; title: string; category: Cat; price: number; stockKg: number; moqKg: number; status: string; views: number; quotes: number; updatedAt: string };

/** A listings-table row with inline price / stock / status editing. */
export function ListingRow({ l }: { l: RowListing }) {
  const [state, action] = useActionState(quickUpdateListing, undefined);
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (state?.ok) {
      setDirty(false);
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(t);
    }
  }, [state]);
  return (
    <motion.tr layout animate={{ backgroundColor: flash ? "rgba(61,220,151,0.08)" : "rgba(0,0,0,0)" }}>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: l.category.hue, flexShrink: 0 }} />
          <div>
            <Link href={`/dashboard/listings/${l.id}`} className="link" style={{ fontWeight: 600 }}>{l.title}</Link>
            <div className="muted" style={{ fontSize: "0.78rem" }}>{l.category.name} · MOQ {qty(l.moqKg)}</div>
          </div>
        </div>
      </td>
      <td colSpan={3}>
        <form action={action} className="inline-edit" onChange={() => setDirty(true)}>
          <input type="hidden" name="id" value={l.id} />
          <label>
            <span>₹/kg</span>
            <input name="price" type="number" step="0.01" min="0.01" defaultValue={l.price} aria-label="Price per kg" />
          </label>
          <label>
            <span>Stock kg</span>
            <input name="stock" type="number" min="0" defaultValue={l.stockKg} aria-label="Stock in kg" />
          </label>
          <select name="status" defaultValue={l.status} className="select select-sm" aria-label="Status">
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="sold_out">Sold out</option>
          </select>
          <AnimatePresence>
            {dirty && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <SubmitButton className="btn btn-gold btn-sm" pendingText="…">Save</SubmitButton>
              </motion.span>
            )}
          </AnimatePresence>
          {state?.error && <span className="down" style={{ fontSize: "0.8rem" }}>{state.error}</span>}
        </form>
      </td>
      <td className="mono">{l.views}</td>
      <td className="mono">{l.quotes}</td>
      <td>
        {l.status === "active" ? (
          <Link href={`/marketplace/${l.slug}`} className="icon-btn" style={{ width: 34, height: 34 }} aria-label="View public page" target="_blank">
            <Icon name="arrowUpRight" size={15} />
          </Link>
        ) : null}
      </td>
    </motion.tr>
  );
}

export function CompanyForm({ c }: { c: { name: string; city: string; state: string; about: string; sinceYear: number | null; capabilities: string[]; certifications: string[]; contactEmail: string | null } }) {
  const [state, action] = useActionState(updateCompany, undefined);
  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="c-name">Company name</label>
        <input id="c-name" name="name" required defaultValue={c.name} />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="c-city">City</label>
          <input id="c-city" name="city" required defaultValue={c.city} />
        </div>
        <div className="field">
          <label htmlFor="c-state">State</label>
          <input id="c-state" name="state" required defaultValue={c.state} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="c-since">Trading since <span className="opt">(year)</span></label>
          <input id="c-since" name="sinceYear" type="number" min="1800" max={new Date().getFullYear()} defaultValue={c.sinceYear ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="c-email">Trade contact email <span className="opt">(not public)</span></label>
          <input id="c-email" name="contactEmail" type="email" defaultValue={c.contactEmail ?? ""} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-about">About your company</label>
        <textarea id="c-about" name="about" maxLength={2000} defaultValue={c.about} placeholder="What you grow or process, where, and for whom." />
      </div>
      <div className="field">
        <label htmlFor="c-caps">Capabilities <span className="opt">(comma separated)</span></label>
        <input id="c-caps" name="capabilities" defaultValue={c.capabilities.join(", ")} placeholder="Sortex cleaning, Steam sterilisation, Grinding" />
      </div>
      <div className="field">
        <label htmlFor="c-certs">Certifications <span className="opt">(comma separated)</span></label>
        <input id="c-certs" name="certifications" defaultValue={c.certifications.join(", ")} placeholder="FSSAI, Spices Board, ISO 22000" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Save company profile</SubmitButton>
    </form>
  );
}

export function OfferForm({ refId, defaultLocation }: { refId: string; defaultLocation: string }) {
  const [state, action] = useActionState(sendRfqOffer, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="form" style={{ marginTop: 14 }}>
      <input type="hidden" name="ref" value={refId} />
      <div className="form-row">
        <div className="field">
          <label htmlFor={`o-loc-${refId}`}>Dispatch location</label>
          <input id={`o-loc-${refId}`} name="location" required defaultValue={defaultLocation} />
        </div>
        <div className="field">
          <label htmlFor={`o-qty-${refId}`}>Quantity you can supply <span className="opt">(optional)</span></label>
          <input id={`o-qty-${refId}`} name="quantity" />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`o-msg-${refId}`}>Your offer</label>
        <textarea id={`o-msg-${refId}`} name="message" required placeholder="Price, grade, packing, lead time, certifications…" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-gold" pendingText="Sending…">Send offer</SubmitButton>
    </form>
  );
}

/** A <select> that submits its form as soon as it changes (used in admin tables). */
export function AutoSelect({ name, value, options, label }: { name: string; value: string; options: [string, string][]; label: string }) {
  return (
    <select
      name={name}
      defaultValue={value}
      className="select select-sm"
      aria-label={label}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map(([v, t]) => (
        <option key={v} value={v}>{t}</option>
      ))}
    </select>
  );
}

export function Expand({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`expand${open ? " open" : ""}`}>
      <button type="button" className="expand-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        {summary}
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: "grid", marginLeft: "auto" }}>
          <Icon name="arrow" size={14} className="rot90" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
            <div className="expand-body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
