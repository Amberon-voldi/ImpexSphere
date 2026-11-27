"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { respondToOffer, reviewOffer, sendMessage, submitOffer, withdrawOffer } from "@/app/actions/offers";
import { incoterms as INCOTERMS } from "@/lib/content";
import type { ThreadMessage } from "@/lib/messaging";
import { offerPriceLabel } from "@/lib/offerFormat";
import Icon from "./Icon";
import { FormMessage, StatusPill, SubmitButton } from "./ui";

// ---------- Inbox ----------

export type InboxItem = {
  id: string;
  subject: string;
  lastMessageAt: string;
  unread: number;
  preview: string | null;
  previewRole: string | null;
  supplierName: string | null;
  offerStatus: string | null;
  as: "buyer" | "supplier" | "admin" | null;
  enquiryId: string | null;
};

function shortAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function InboxList({ items }: { items: InboxItem[] }) {
  const path = usePathname();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const shown = items.filter(
    (i) => (filter === "all" || i.unread > 0) && (!q || `${i.subject} ${i.supplierName ?? ""} ${i.preview ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className={`inbox${path === "/messages" ? "" : " has-open"}`}>
      <div className="inbox-head">
        <h1>Messages</h1>
        <div className="seg" role="group" aria-label="Filter">
          {(["all", "unread"] as const).map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
              {filter === f && <motion.span layoutId="inbox-seg" className="seg-pill" />}
              {f === "all" ? "All" : "Unread"}
            </button>
          ))}
        </div>
      </div>
      <label className="searchbox" style={{ margin: "0 12px 10px" }}>
        <Icon name="search" size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
      </label>
      <div className="inbox-list">
        {shown.map((i) => {
          const active = path === `/messages/${i.id}`;
          return (
            <Link key={i.id} href={`/messages/${i.id}`} className={`inbox-item${active ? " active" : ""}${i.unread ? " unread" : ""}`}>
              {active && <motion.span layoutId="inbox-active" className="inbox-active" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <div className="row1">
                <b>{i.subject}</b>
                <span>{shortAgo(i.lastMessageAt)}</span>
              </div>
              <div className="row2">
                <span className="who">
                  {i.as === "supplier" ? "Buyer conversation" : i.supplierName ?? "ImpexSphere"}
                  {i.offerStatus && <StatusPill status={i.offerStatus} />}
                </span>
                {i.unread > 0 && <em>{i.unread}</em>}
              </div>
              {i.preview && <p>{i.previewRole === "system" ? "• " : ""}{i.preview.split("\n")[0]}</p>}
            </Link>
          );
        })}
        {!shown.length && <div className="empty" style={{ padding: 30 }}>{items.length ? "No conversations match." : "No conversations yet."}</div>}
      </div>
    </div>
  );
}

// ---------- Conversation ----------

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 86400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

export function Conversation({
  threadId,
  initial,
  canPost,
  offerStatuses,
  closedReason,
}: {
  threadId: string;
  initial: ThreadMessage[];
  canPost: boolean;
  offerStatuses: string;
  closedReason?: string;
}) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<(ThreadMessage & { pending?: boolean; failed?: boolean })[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef(initial.at(-1)?.at ?? new Date(0).toISOString());
  const statusKey = useRef(offerStatuses);

  const scrollDown = useCallback((smooth = true) => {
    const el = boxRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);
  useEffect(() => scrollDown(false), [scrollDown]);

  // Live updates: poll while the tab is visible.
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/threads/${threadId}?after=${encodeURIComponent(lastAt.current)}`, { cache: "no-store" });
        if (!r.ok || stop) return;
        const d: { messages: ThreadMessage[]; offers: { id: string; status: string }[] } = await r.json();
        if (d.messages.length) {
          lastAt.current = d.messages.at(-1)!.at;
          setMsgs((cur) => {
            const ids = new Set(cur.map((m) => m.id));
            return [...cur, ...d.messages.filter((m) => !ids.has(m.id))];
          });
          const el = boxRef.current;
          if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) setTimeout(() => scrollDown(), 50);
        }
        const key = d.offers.map((o) => `${o.id}:${o.status}`).join(",");
        if (key !== statusKey.current) {
          statusKey.current = key;
          router.refresh();
        }
      } catch {}
    };
    const iv = setInterval(tick, 4000);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [threadId, router, scrollDown]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    const tempId = `tmp-${Date.now()}`;
    setMsgs((m) => [...m, { id: tempId, role: "buyer", mine: true, author: "You", body, at: new Date().toISOString(), pending: true }]);
    setText("");
    setError("");
    setTimeout(() => scrollDown(), 30);
    startTransition(async () => {
      const res = await sendMessage(threadId, body);
      if (res.error || !res.message) {
        setMsgs((m) => m.map((x) => (x.id === tempId ? { ...x, pending: false, failed: true } : x)));
        setError(res.error ?? "Message not sent.");
        return;
      }
      lastAt.current = res.message.at > lastAt.current ? res.message.at : lastAt.current;
      setMsgs((m) => {
        const without = m.filter((x) => x.id !== tempId && x.id !== res.message!.id);
        return [...without, res.message!];
      });
    });
  };

  let lastDay = "";
  return (
    <div className="convo">
      <div className="convo-msgs" ref={boxRef} aria-live="polite">
        {msgs.map((m, i) => {
          const day = dayLabel(m.at);
          const showDay = day !== lastDay;
          lastDay = day;
          const prev = msgs[i - 1];
          const grouped = prev && !showDay && prev.author === m.author && prev.role === m.role && m.role !== "system";
          return (
            <div key={m.id}>
              {showDay && <div className="day-sep"><span>{day}</span></div>}
              {m.role === "system" ? (
                <motion.div className="sys-msg" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                  <Icon name="sparkle" size={13} />
                  <div>{m.body}</div>
                  <time>{new Date(m.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</time>
                </motion.div>
              ) : (
                <motion.div
                  className={`bubble-row${m.mine ? " mine" : ""} role-${m.role}${grouped ? " grouped" : ""}`}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: m.pending ? 0.6 : 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  {!grouped && !m.mine && <div className="author">{m.author}</div>}
                  <div className={`bubble${m.failed ? " failed" : ""}`}>
                    {m.body}
                    <time>
                      {new Date(m.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                      {m.mine && (m.pending ? " · sending" : m.failed ? " · failed" : " ✓")}
                    </time>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {canPost ? (
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
            rows={1}
            maxLength={5000}
            aria-label="Message"
          />
          <motion.button className="btn btn-gold send-btn" type="submit" disabled={!text.trim()} whileTap={{ scale: 0.9 }} aria-label="Send">
            <Icon name="arrow" size={18} />
          </motion.button>
          {error && <div className="form-error composer-err">{error}</div>}
        </form>
      ) : (
        <div className="composer closed">{closedReason ?? "This conversation is closed."}</div>
      )}
    </div>
  );
}

// ---------- Offers ----------

export type OfferView = {
  id: string;
  ref: string;
  price: number;
  currency: string;
  unit: string;
  quantity: string;
  incoterm: string | null;
  port: string | null;
  leadTimeDays: number | null;
  validUntil: string | null;
  notes: string | null;
  status: string;
  buyerNote: string | null;
  adminNote: string | null;
  supplierName: string;
  supplierSlug?: string | null;
  usdMt: number;
  createdAt: string;
};

export function OfferCard({ o, as, threadId, best }: { o: OfferView; as: "buyer" | "supplier" | "admin"; threadId?: string; best?: boolean }) {
  const [state, action] = useActionState(respondToOffer, undefined);
  const [deciding, setDeciding] = useState<null | "accept" | "decline">(null);
  const expired = !!o.validUntil && new Date(o.validUntil) < new Date();
  return (
    <motion.div layout className={`card offer-card${best ? " best" : ""}`}>
      {best && <span className="best-tag">Best price</span>}
      <div className="offer-top">
        <div>
          <span className="mono muted" style={{ fontSize: "0.75rem" }}>{o.ref}</span>
          <div className="offer-price">
            {offerPriceLabel(o)}
            <small>/{o.unit}</small>
          </div>
          {o.currency !== "USD" || o.unit !== "MT" ? <div className="mono muted" style={{ fontSize: "0.78rem" }}>≈ US${Math.round(o.usdMt).toLocaleString("en-US")}/MT</div> : null}
        </div>
        <StatusPill status={expired && o.status === "shared" ? "expired" : o.status} />
      </div>
      <div className="offer-facts">
        <div><span>Supplier</span><b>{o.supplierSlug ? <Link href={`/suppliers/${o.supplierSlug}`} className="link">{o.supplierName}</Link> : o.supplierName}</b></div>
        <div><span>Quantity</span><b>{o.quantity}</b></div>
        <div><span>Terms</span><b>{o.incoterm ? `${o.incoterm}${o.port ? ` ${o.port}` : ""}` : "—"}</b></div>
        <div><span>Dispatch</span><b>{o.leadTimeDays != null ? `${o.leadTimeDays} days` : "—"}</b></div>
        <div><span>Valid until</span><b className={expired ? "down" : ""}>{o.validUntil ? new Date(o.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</b></div>
      </div>
      {o.notes && <p className="offer-notes">{o.notes}</p>}
      {o.buyerNote && <p className="fine">Buyer&apos;s note: {o.buyerNote}</p>}
      {as === "admin" && o.adminNote && <p className="fine">Internal note: {o.adminNote}</p>}

      <div className="offer-actions">
        {threadId && (
          <Link href={`/messages/${threadId}`} className="btn btn-sm">
            Message
          </Link>
        )}
        {as === "buyer" && o.status === "shared" && !state?.ok && (
          <>
            <button className="btn btn-sm btn-ghost" onClick={() => setDeciding("decline")}>Decline</button>
            {!expired && <button className="btn btn-sm btn-gold" onClick={() => setDeciding("accept")}>Accept offer</button>}
          </>
        )}
        {as === "supplier" && ["submitted", "shared"].includes(o.status) && (
          <form action={withdrawOffer}>
            <input type="hidden" name="id" value={o.id} />
            <SubmitButton className="btn btn-sm btn-ghost danger" pendingText="…">Withdraw</SubmitButton>
          </form>
        )}
        {as === "admin" && ["submitted", "rejected"].includes(o.status) && (
          <form action={reviewOffer}>
            <input type="hidden" name="id" value={o.id} />
            <input type="hidden" name="action" value="share" />
            <SubmitButton className="btn btn-sm btn-gold" pendingText="…">Share with buyer</SubmitButton>
          </form>
        )}
        {as === "admin" && ["submitted", "shared"].includes(o.status) && (
          <form action={reviewOffer}>
            <input type="hidden" name="id" value={o.id} />
            <input type="hidden" name="action" value="reject" />
            <SubmitButton className="btn btn-sm btn-ghost danger" pendingText="…">Don&apos;t share</SubmitButton>
          </form>
        )}
      </div>
      <AnimatePresence>
        {deciding && !state?.ok && (
          <motion.form
            action={action}
            className="form decide"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input type="hidden" name="id" value={o.id} />
            <input type="hidden" name="decision" value={deciding} />
            <div className="field">
              <label htmlFor={`note-${o.id}`}>
                {deciding === "accept" ? "Anything the trade desk should know?" : "Reason (shared with the supplier)"} <span className="opt">(optional)</span>
              </label>
              <textarea id={`note-${o.id}`} name="note" style={{ minHeight: 70 }} />
            </div>
            {deciding === "accept" && (
              <p className="fine">Accepting tells the trade desk to prepare the proforma invoice. Payment terms follow our order-backed model (advance before procurement).</p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setDeciding(null)}>Cancel</button>
              <SubmitButton className={`btn btn-sm ${deciding === "accept" ? "btn-gold" : "danger"}`} pendingText="…">
                {deciding === "accept" ? "Confirm accept" : "Confirm decline"}
              </SubmitButton>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <FormMessage state={state} />
    </motion.div>
  );
}

/** Structured offer form for suppliers. Pass either `rfq` (ref) or `enquiry` (id). */
export function SupplierOfferForm({ rfq, enquiry, defaults, onDone }: { rfq?: string; enquiry?: string; defaults?: { quantity?: string; incoterm?: string | null; port?: string }; onDone?: () => void }) {
  const [state, action] = useActionState(submitOffer, undefined);
  const router = useRouter();
  const [currency, setCurrency] = useState(state?.values?.currency ?? "USD");
  const [unit, setUnit] = useState(state?.values?.unit ?? "MT");
  useEffect(() => {
    if (state?.ok) {
      onDone?.();
      router.refresh();
    }
  }, [state, onDone, router]);
  if (state?.ok)
    return (
      <div className="form-ok">
        <Icon name="check" size={15} stroke={2.6} /> {state.ok}{" "}
        {"threadId" in state && state.threadId ? <Link href={`/messages/${state.threadId}`} className="link">Open conversation</Link> : null}
      </div>
    );
  const v = state?.values ?? {};
  return (
    <form action={action} className="form">
      {rfq && <input type="hidden" name="rfq" value={rfq} />}
      {enquiry && <input type="hidden" name="enquiry" value={enquiry} />}
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="unit" value={unit} />
      <div className="field">
        <label htmlFor={`of-price-${rfq ?? enquiry}`}>Price</label>
        <div className="price-input">
          <button type="button" onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")} aria-label="Switch currency">{currency === "USD" ? "US$" : "₹"}</button>
          <input id={`of-price-${rfq ?? enquiry}`} name="price" type="number" step="0.01" min="0.01" required defaultValue={v.price} placeholder={unit === "MT" ? "e.g. 1650" : "e.g. 140"} />
          <button type="button" onClick={() => setUnit(unit === "MT" ? "kg" : "MT")} aria-label="Switch unit">per {unit}</button>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor={`of-qty-${rfq ?? enquiry}`}>Quantity you can supply</label>
          <input id={`of-qty-${rfq ?? enquiry}`} name="quantity" required defaultValue={v.quantity ?? defaults?.quantity} placeholder="e.g. 18 MT (1 × 20' FCL)" />
        </div>
        <div className="field">
          <label htmlFor={`of-inco-${rfq ?? enquiry}`}>Incoterm</label>
          <select id={`of-inco-${rfq ?? enquiry}`} name="incoterm" defaultValue={v.incoterm ?? defaults?.incoterm ?? "FOB"}>
            {INCOTERMS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor={`of-port-${rfq ?? enquiry}`}>Port / place <span className="opt">(optional)</span></label>
          <input id={`of-port-${rfq ?? enquiry}`} name="port" defaultValue={v.port ?? defaults?.port} placeholder="e.g. Nhava Sheva / Rotterdam" />
        </div>
        <div className="field">
          <label htmlFor={`of-lead-${rfq ?? enquiry}`}>Dispatch in (days) <span className="opt">(optional)</span></label>
          <input id={`of-lead-${rfq ?? enquiry}`} name="leadTimeDays" type="number" min="0" max="365" defaultValue={v.leadTimeDays} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`of-valid-${rfq ?? enquiry}`}>Valid until <span className="opt">(optional)</span></label>
        <input id={`of-valid-${rfq ?? enquiry}`} name="validUntil" type="date" defaultValue={v.validUntil} min={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="field">
        <label htmlFor={`of-notes-${rfq ?? enquiry}`}>Notes <span className="opt">(optional)</span></label>
        <textarea id={`of-notes-${rfq ?? enquiry}`} name="notes" defaultValue={v.notes} placeholder="Grade, packing, certifications, payment terms…" style={{ minHeight: 80 }} />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-gold" pendingText="Sending…">
        Send offer <Icon name="arrow" size={16} className="arrow" />
      </SubmitButton>
      <p className="fine">The trade desk reviews every offer before the buyer sees it.</p>
    </form>
  );
}
