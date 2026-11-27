"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { enquiries, getDb, listings, offers, rfqs, threads, type Offer } from "@/db";
import { getCurrentUser, requireSupplier, requireUser } from "@/lib/auth";
import { incoterms as INCOTERMS } from "@/lib/content";
import { ensureEnquiryThread, getThreadFor, loadMessages, makeOfferRef, postMessage, type ThreadMessage } from "@/lib/messaging";
import { notify } from "@/lib/notify";
import { formatOffer } from "@/lib/offerFormat";
import type { FormState } from "./auth";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);

function refreshAll(threadId?: string) {
  revalidatePath("/messages", "layout");
  revalidatePath("/account", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
  if (threadId) revalidatePath(`/messages/${threadId}`);
}

// ---------- Messages ----------

export async function sendMessage(threadId: string, body: string): Promise<{ error?: string; message?: ThreadMessage }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const text = body.trim().slice(0, 5000);
  if (!text) return { error: "Write a message first." };
  const t = await getThreadFor(user, threadId);
  if (!t || !t.as) return { error: "Conversation not found." };
  const closed = t.offers.length > 0 && t.offerId && ["withdrawn", "rejected"].includes(t.offers[0].status);
  if (closed && t.as !== "admin") return { error: "This conversation is closed." };
  const m = await postMessage(threadId, { userId: user.id, role: t.as }, text);
  const loaded = await loadMessages(user, threadId, new Date(m.createdAt.getTime() - 1));
  return { message: loaded?.messages.find((x) => x.id === m.id) };
}

// ---------- Offers (suppliers) ----------

/** A supplier's priced offer: on a buying request (`rfq` = ref) or a quote request on their listing (`enquiry` = id). */
export async function submitOffer(_: FormState, f: FormData): Promise<FormState & { threadId?: string }> {
  const user = await requireSupplier();
  const values = Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const price = Number(str(f, "price").replace(/,/g, ""));
  const currency = str(f, "currency") === "INR" ? "INR" : "USD";
  const unit = str(f, "unit") === "kg" ? "kg" : "MT";
  const quantity = str(f, "quantity", 160);
  const incoterm = str(f, "incoterm");
  const lead = str(f, "leadTimeDays");
  const valid = str(f, "validUntil");
  if (!(price > 0 && price < 100_000_000)) return { error: "Enter a price above zero.", values };
  if (!quantity) return { error: "Enter the quantity you can supply.", values };
  if (incoterm && !(INCOTERMS as string[]).includes(incoterm)) return { error: "Choose a valid Incoterm.", values };
  const leadTimeDays = lead ? Math.round(Number(lead)) : null;
  if (leadTimeDays !== null && !(leadTimeDays >= 0 && leadTimeDays <= 365)) return { error: "Dispatch time must be 0–365 days.", values };
  const validUntil = valid ? new Date(`${valid}T23:59:59Z`) : null;
  if (validUntil && (isNaN(+validUntil) || validUntil < new Date())) return { error: "The validity date must be in the future.", values };

  const db = getDb();
  const rfqRef = str(f, "rfq", 40);
  const enquiryId = str(f, "enquiry", 64);
  let target: { rfqId: string | null; enquiryId: string | null; subject: string; buyerUserId: string | null };
  if (rfqRef) {
    const [r] = await db
      .select({ id: rfqs.id, commodity: rfqs.commodity, userId: rfqs.userId })
      .from(rfqs)
      .where(and(eq(rfqs.ref, rfqRef), eq(rfqs.status, "open")))
      .limit(1);
    if (!r) return { error: "This buying request is no longer open.", values };
    const [dup] = await db
      .select({ id: offers.id })
      .from(offers)
      .where(and(eq(offers.rfqId, r.id), eq(offers.supplierId, user.supplier.id)))
      .limit(1);
    if (dup) return { error: "You've already sent an offer on this request. Use the conversation to follow up.", values };
    target = { rfqId: r.id, enquiryId: null, subject: `${rfqRef} · ${r.commodity}`, buyerUserId: r.userId };
  } else if (/^[0-9a-f-]{36}$/i.test(enquiryId)) {
    const [e] = await db
      .select({ id: enquiries.id, supplierId: listings.supplierId })
      .from(enquiries)
      .innerJoin(listings, eq(enquiries.listingId, listings.id))
      .where(and(eq(enquiries.id, enquiryId), eq(enquiries.kind, "listing_quote")))
      .limit(1);
    if (!e || e.supplierId !== user.supplier.id) return { error: "Quote request not found.", values };
    target = { rfqId: null, enquiryId: e.id, subject: "", buyerUserId: null };
  } else {
    return { error: "Nothing to make an offer on.", values };
  }

  const base = {
    rfqId: target.rfqId,
    enquiryId: target.enquiryId,
    supplierId: user.supplier.id,
    createdBy: user.id,
    price: Math.round(price * 100) / 100,
    currency,
    unit,
    quantity,
    incoterm: incoterm || null,
    port: str(f, "port", 120) || null,
    leadTimeDays,
    validUntil,
    notes: str(f, "notes", 2000) || null,
  };
  let offer: Offer | undefined;
  for (let i = 0; i < 4 && !offer; i++) {
    [offer] = await db.insert(offers).values({ ...base, ref: makeOfferRef() }).onConflictDoNothing({ target: offers.ref }).returning();
  }
  if (!offer) return { error: "Couldn't save the offer. Please try again.", values };

  let threadId: string | null;
  if (target.rfqId) {
    const [t] = await db
      .insert(threads)
      .values({ offerId: offer.id, buyerUserId: target.buyerUserId, supplierId: user.supplier.id, subject: target.subject })
      .returning({ id: threads.id });
    threadId = t.id;
  } else {
    threadId = await ensureEnquiryThread(target.enquiryId!);
  }
  if (threadId) {
    await postMessage(threadId, { userId: null, role: "system" }, `${user.supplier.name} sent an offer.\n${formatOffer(offer)}`);
  }
  await notify(`New offer ${offer.ref} from ${user.supplier.name}`, "New offer to review", { offer: formatOffer(offer) }, offer.id).catch(
    (e) => console.error(e),
  );
  refreshAll(threadId ?? undefined);
  return { ok: `Offer ${offer.ref} sent. The trade desk will review it and share it with the buyer.`, threadId: threadId ?? undefined };
}

async function offerWithThread(offerId: string) {
  const db = getDb();
  const [o] = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
  if (!o) return null;
  const [t] = await db
    .select({ id: threads.id })
    .from(threads)
    .where(o.rfqId ? eq(threads.offerId, o.id) : eq(threads.enquiryId, o.enquiryId!))
    .limit(1);
  return { offer: o, threadId: t?.id ?? null };
}

export async function withdrawOffer(f: FormData) {
  const user = await requireSupplier();
  const x = await offerWithThread(str(f, "id", 64));
  if (!x || x.offer.supplierId !== user.supplier.id || !["submitted", "shared"].includes(x.offer.status)) return;
  await getDb().update(offers).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(offers.id, x.offer.id));
  if (x.threadId) await postMessage(x.threadId, { userId: null, role: "system" }, `${user.supplier.name} withdrew offer ${x.offer.ref}.`);
  refreshAll(x.threadId ?? undefined);
}

// ---------- Offers (buyers) ----------

/** Is this user the buyer behind the offer's request? */
async function isOfferBuyer(o: Offer, userId: string) {
  const db = getDb();
  if (o.rfqId) {
    const [r] = await db.select({ userId: rfqs.userId }).from(rfqs).where(eq(rfqs.id, o.rfqId)).limit(1);
    return r?.userId === userId;
  }
  const [e] = await db.select({ userId: enquiries.userId }).from(enquiries).where(eq(enquiries.id, o.enquiryId!)).limit(1);
  return e?.userId === userId;
}

export async function respondToOffer(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const decision = str(f, "decision");
  const x = await offerWithThread(str(f, "id", 64));
  if (!x || !(await isOfferBuyer(x.offer, user.id))) return { error: "Offer not found." };
  if (x.offer.status !== "shared") return { error: "This offer can no longer be changed." };
  if (x.offer.validUntil && x.offer.validUntil < new Date() && decision === "accept")
    return { error: "This offer has expired. Message the supplier to ask for a fresh price." };
  const db = getDb();
  const note = str(f, "note", 1000) || null;
  if (decision === "accept") {
    await db.update(offers).set({ status: "accepted", buyerNote: note, updatedAt: new Date() }).where(eq(offers.id, x.offer.id));
    if (x.offer.rfqId) await db.update(rfqs).set({ status: "closed", updatedAt: new Date() }).where(eq(rfqs.id, x.offer.rfqId));
    if (x.threadId)
      await postMessage(
        x.threadId,
        { userId: null, role: "system" },
        `The buyer accepted offer ${x.offer.ref}. The ImpexSphere trade desk will send the proforma invoice and payment terms.${note ? `\nBuyer's note: ${note}` : ""}`,
      );
    await notify(`Offer ${x.offer.ref} ACCEPTED`, "Buyer accepted an offer", { offer: formatOffer(x.offer), buyer: user.email, note: note ?? undefined }, x.offer.id).catch(
      (e) => console.error(e),
    );
  } else if (decision === "decline") {
    await db.update(offers).set({ status: "declined", buyerNote: note, updatedAt: new Date() }).where(eq(offers.id, x.offer.id));
    if (x.threadId) await postMessage(x.threadId, { userId: null, role: "system" }, `The buyer declined offer ${x.offer.ref}.${note ? `\nReason: ${note}` : ""}`);
  } else {
    return { error: "Choose accept or decline." };
  }
  refreshAll(x.threadId ?? undefined);
  return { ok: decision === "accept" ? "Offer accepted. The trade desk will be in touch with the paperwork." : "Offer declined." };
}

// ---------- Offers (trade desk) ----------

export async function reviewOffer(f: FormData) {
  await requireUser("admin");
  const action = str(f, "action");
  const x = await offerWithThread(str(f, "id", 64));
  if (!x) return;
  const db = getDb();
  const adminNote = f.has("adminNote") ? str(f, "adminNote", 2000) || null : undefined;
  if (action === "share" && ["submitted", "rejected"].includes(x.offer.status)) {
    await db.update(offers).set({ status: "shared", updatedAt: new Date(), ...(adminNote !== undefined && { adminNote }) }).where(eq(offers.id, x.offer.id));
    if (x.threadId) await postMessage(x.threadId, { userId: null, role: "system" }, `Offer ${x.offer.ref} has been shared with the buyer.`);
  } else if (action === "reject" && ["submitted", "shared"].includes(x.offer.status)) {
    await db.update(offers).set({ status: "rejected", updatedAt: new Date(), ...(adminNote !== undefined && { adminNote }) }).where(eq(offers.id, x.offer.id));
    if (x.threadId) await postMessage(x.threadId, { userId: null, role: "system" }, `Offer ${x.offer.ref} was not shared with the buyer.`);
  } else if (adminNote !== undefined) {
    await db.update(offers).set({ adminNote, updatedAt: new Date() }).where(eq(offers.id, x.offer.id));
  }
  refreshAll(x.threadId ?? undefined);
}

/** Opens (creating if needed) the conversation for a quote request. Used by the dashboard and admin. */
export async function openQuoteThread(enquiryId: string) {
  const user = await requireUser(["supplier", "admin"]);
  const id = await ensureEnquiryThread(enquiryId);
  if (!id || !(await getThreadFor(user, id))) return null;
  return id;
}
