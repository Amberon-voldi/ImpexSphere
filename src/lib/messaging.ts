import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import {
  enquiries,
  getDb,
  listings,
  messages,
  offers,
  rfqs,
  suppliers,
  threadReads,
  threads,
  users,
  type Offer,
} from "@/db";
import type { SessionUser } from "./auth";
import { siteUrl } from "./auth";
import { actionEmail, sendEmail } from "./email";
import { notify } from "./notify";

/** Offer statuses a buyer is allowed to see. */
export const BUYER_VISIBLE = ["shared", "accepted", "declined"] as const;

export type Viewer = Pick<SessionUser, "id" | "role" | "supplierId">;

/** SQL condition: threads this user may see. */
export function visibleThreads(u: Viewer): SQL {
  if (u.role === "admin") return sql`true`;
  const conds: SQL[] = [];
  if (u.supplierId) conds.push(eq(threads.supplierId, u.supplierId));
  conds.push(
    and(
      eq(threads.buyerUserId, u.id),
      or(
        isNull(threads.offerId),
        sql`${threads.offerId} in (select id from impexsphere.offers where status in ('shared','accepted','declined'))`,
      ),
    )!,
  );
  return or(...conds)!;
}

/** How this viewer relates to a thread. */
export function perspective(u: Viewer, t: { buyerUserId: string | null; supplierId: string | null }) {
  if (u.supplierId && t.supplierId === u.supplierId) return "supplier" as const;
  if (t.buyerUserId === u.id) return "buyer" as const;
  if (u.role === "admin") return "admin" as const;
  return null;
}

const lastRead = (u: Viewer) =>
  u.role === "admin"
    ? sql`coalesce(${threads.deskReadAt}, 'epoch'::timestamptz)`
    : sql`coalesce((select r.last_read_at from impexsphere.thread_reads r where r.thread_id = ${threads.id} and r.user_id = ${u.id}), 'epoch'::timestamptz)`;

/** Unread messages across all visible threads (excluding your own). */
export async function unreadCount(u: Viewer) {
  const [r] = await getDb()
    .select({
      n: sql<number>`count(*)::int`,
    })
    .from(messages)
    .innerJoin(threads, eq(messages.threadId, threads.id))
    .where(
      and(
        visibleThreads(u),
        sql`${messages.createdAt} > ${lastRead(u)}`,
        ne(messages.authorRole, "system"),
        or(isNull(messages.authorUserId), ne(messages.authorUserId, u.id)),
        u.role === "admin" ? ne(messages.authorRole, "admin") : sql`true`,
      ),
    );
  return r?.n ?? 0;
}

export async function inbox(u: Viewer, limit = 100) {
  const rows = await getDb()
    .select({
      id: threads.id,
      subject: threads.subject,
      lastMessageAt: threads.lastMessageAt,
      enquiryId: threads.enquiryId,
      offerId: threads.offerId,
      buyerUserId: threads.buyerUserId,
      supplierId: threads.supplierId,
      supplierName: suppliers.name,
      offerStatus: offers.status,
      unread: sql<number>`(select count(*)::int from impexsphere.messages m where m.thread_id = ${threads.id}
        and m.created_at > ${lastRead(u)} and m.author_role <> 'system' and (m.author_user_id is null or m.author_user_id <> ${u.id})
        ${u.role === "admin" ? sql`and m.author_role <> 'admin'` : sql``})`,
      preview: sql<string | null>`(select m.body from impexsphere.messages m where m.thread_id = ${threads.id} order by m.created_at desc limit 1)`,
      previewRole: sql<string | null>`(select m.author_role from impexsphere.messages m where m.thread_id = ${threads.id} order by m.created_at desc limit 1)`,
    })
    .from(threads)
    .leftJoin(suppliers, eq(threads.supplierId, suppliers.id))
    .leftJoin(offers, eq(threads.offerId, offers.id))
    .where(visibleThreads(u))
    .orderBy(desc(threads.lastMessageAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, lastMessageAt: r.lastMessageAt.toISOString(), as: perspective(u, r) }));
}

export type ThreadMessage = { id: string; role: "buyer" | "supplier" | "admin" | "system"; mine: boolean; author: string; body: string; at: string };

/** Display name for a message author, from the viewer's point of view. */
function authorLabel(role: string, mine: boolean, viewerAs: string | null, supplierName: string | null, buyerLabel: string) {
  if (mine) return "You";
  if (role === "admin") return "ImpexSphere trade desk";
  if (role === "system") return "ImpexSphere";
  if (role === "supplier") return supplierName ?? "Supplier";
  return viewerAs === "admin" ? buyerLabel : `Buyer${buyerLabel.includes("·") ? " · " + buyerLabel.split("·").pop()!.trim() : ""}`;
}

export async function loadMessages(u: Viewer, threadId: string, after?: Date) {
  const t = await getThreadFor(u, threadId);
  if (!t) return null;
  const rows = await getDb()
    .select({ id: messages.id, role: messages.authorRole, authorUserId: messages.authorUserId, body: messages.body, at: messages.createdAt })
    .from(messages)
    .where(and(eq(messages.threadId, threadId), after ? gt(messages.createdAt, after) : undefined))
    .orderBy(asc(messages.createdAt))
    .limit(500);
  const out: ThreadMessage[] = rows.map((m) => {
    const mine = m.authorUserId === u.id;
    return { id: m.id, role: m.role, mine, author: authorLabel(m.role, mine, t.as, t.supplierName, t.buyerLabel), body: m.body, at: m.at.toISOString() };
  });
  return { thread: t, messages: out };
}

/** A thread with its context, if this user may see it. */
export async function getThreadFor(u: Viewer, threadId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) return null;
  const [t] = await getDb()
    .select({
      id: threads.id,
      subject: threads.subject,
      enquiryId: threads.enquiryId,
      offerId: threads.offerId,
      buyerUserId: threads.buyerUserId,
      supplierId: threads.supplierId,
      supplierName: suppliers.name,
      supplierSlug: suppliers.slug,
      supplierStatus: suppliers.status,
      lastMessageAt: threads.lastMessageAt,
    })
    .from(threads)
    .leftJoin(suppliers, eq(threads.supplierId, suppliers.id))
    .where(and(eq(threads.id, threadId), visibleThreads(u)))
    .limit(1);
  if (!t) return null;

  const db = getDb();
  // Context: the quote request (listing) or the buying request behind the offer.
  let enquiry: { id: string; quantity: string | null; country: string | null; incoterm: string | null; message: string | null; company: string; name: string; email: string; listingTitle: string | null; listingSlug: string | null; listingPrice: number | null } | null = null;
  let rfq: { id: string; ref: string; commodity: string; quantity: string; destination: string; incoterm: string | null; targetPrice: string | null; specs: string | null; status: string; buyerCompany: string; buyerName: string; buyerEmail: string } | null = null;
  if (t.enquiryId) {
    const [e] = await db
      .select({
        id: enquiries.id,
        quantity: enquiries.quantity,
        country: enquiries.country,
        incoterm: enquiries.incoterm,
        message: enquiries.message,
        company: enquiries.company,
        name: enquiries.name,
        email: enquiries.email,
        listingTitle: listings.title,
        listingSlug: listings.slug,
        listingPrice: listings.priceInrKg,
      })
      .from(enquiries)
      .leftJoin(listings, eq(enquiries.listingId, listings.id))
      .where(eq(enquiries.id, t.enquiryId))
      .limit(1);
    enquiry = e ?? null;
  }
  if (t.offerId) {
    const [r] = await db
      .select({
        id: rfqs.id,
        ref: rfqs.ref,
        commodity: rfqs.commodity,
        quantity: rfqs.quantity,
        destination: rfqs.destination,
        incoterm: rfqs.incoterm,
        targetPrice: rfqs.targetPrice,
        specs: rfqs.specs,
        status: rfqs.status,
        buyerCompany: rfqs.buyerCompany,
        buyerName: rfqs.buyerName,
        buyerEmail: rfqs.buyerEmail,
      })
      .from(offers)
      .innerJoin(rfqs, eq(offers.rfqId, rfqs.id))
      .where(eq(offers.id, t.offerId))
      .limit(1);
    rfq = r ?? null;
  }
  const threadOffers = await db
    .select()
    .from(offers)
    .where(t.offerId ? eq(offers.id, t.offerId) : t.enquiryId ? eq(offers.enquiryId, t.enquiryId) : sql`false`)
    .orderBy(desc(offers.createdAt));

  const as = perspective(u, t);
  const destination = enquiry?.country ?? rfq?.destination ?? "";
  const buyerLabel = as === "admin" ? `${enquiry?.company ?? rfq?.buyerCompany ?? "Buyer"} · ${destination}` : `Buyer · ${destination}`;
  return {
    ...t,
    as,
    buyerLabel,
    enquiry,
    rfq,
    offers: as === "buyer" ? threadOffers.filter((o) => (BUYER_VISIBLE as readonly string[]).includes(o.status)) : threadOffers,
  };
}

export type ThreadView = NonNullable<Awaited<ReturnType<typeof getThreadFor>>>;

export async function markRead(u: Viewer, threadId: string) {
  const db = getDb();
  if (u.role === "admin") {
    await db.update(threads).set({ deskReadAt: new Date() }).where(eq(threads.id, threadId));
    return;
  }
  await db
    .insert(threadReads)
    .values({ threadId, userId: u.id, lastReadAt: new Date() })
    .onConflictDoUpdate({ target: [threadReads.threadId, threadReads.userId], set: { lastReadAt: new Date() } });
}

/**
 * Adds a message and emails the other participants who were caught up
 * (so a burst of messages sends one email, not one per message).
 */
export async function postMessage(threadId: string, author: { userId: string | null; role: "buyer" | "supplier" | "admin" | "system" }, body: string) {
  const db = getDb();
  const [t] = await db.select().from(threads).where(eq(threads.id, threadId)).limit(1);
  if (!t) throw new Error("Thread not found");
  const prevLast = t.lastMessageAt;
  const now = new Date();
  const [m] = await db.insert(messages).values({ threadId, authorUserId: author.userId, authorRole: author.role, body }).returning();
  await db.update(threads).set({ lastMessageAt: now }).where(eq(threads.id, threadId));
  if (author.userId) await markRead({ id: author.userId, role: author.role === "admin" ? "admin" : "buyer", supplierId: null }, threadId);
  if (author.role === "system") return m;

  // Notify (best effort, never blocks the sender).
  notifyParticipants(t, author, body, prevLast).catch((err) => console.error("Message notification failed", err));
  return m;
}

async function notifyParticipants(
  t: typeof threads.$inferSelect,
  author: { userId: string | null; role: string },
  body: string,
  prevLast: Date,
) {
  const db = getDb();
  const url = `${await siteUrl()}/messages/${t.id}`;
  const preview = body.length > 400 ? body.slice(0, 400) + "…" : body;
  const recipients: { id: string; email: string }[] = [];

  // Buyer (only once the offer is visible to them).
  if (t.buyerUserId && t.buyerUserId !== author.userId) {
    let visible = true;
    if (t.offerId) {
      const [o] = await db.select({ status: offers.status }).from(offers).where(eq(offers.id, t.offerId)).limit(1);
      visible = !!o && (BUYER_VISIBLE as readonly string[]).includes(o.status);
    }
    if (visible) {
      const [b] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, t.buyerUserId)).limit(1);
      if (b) recipients.push(b);
    }
  }
  // Supplier accounts.
  if (t.supplierId) {
    const sup = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(and(eq(users.supplierId, t.supplierId), eq(users.disabled, false)));
    recipients.push(...sup.filter((s) => s.id !== author.userId));
  }
  if (recipients.length) {
    const reads = await db
      .select({ userId: threadReads.userId, at: threadReads.lastReadAt })
      .from(threadReads)
      .where(and(eq(threadReads.threadId, t.id), inArray(threadReads.userId, recipients.map((r) => r.id))));
    for (const r of recipients) {
      // Never opened → treat as read up to when the thread started.
      const read = reads.find((x) => x.userId === r.id)?.at ?? t.createdAt;
      // Already had unread messages here, so they've been emailed once; don't send another.
      if (read < prevLast) continue;
      await sendEmail({
        to: r.email,
        subject: `New message: ${t.subject}`,
        ...actionEmail(`New message about ${t.subject}`, preview, "Open conversation", url),
      }).catch((e) => console.error(e));
    }
  }
  // Trade desk.
  if (author.role !== "admin" && (!t.deskReadAt || t.deskReadAt >= prevLast)) {
    await notify(`Message: ${t.subject}`, `New ${author.role} message`, { message: preview, link: url }, t.id);
  }
}

/** The thread for a listing quote request, created on first use. */
export async function ensureEnquiryThread(enquiryId: string) {
  const db = getDb();
  const [existing] = await db.select({ id: threads.id }).from(threads).where(eq(threads.enquiryId, enquiryId)).limit(1);
  if (existing) return existing.id;
  const [e] = await db
    .select({
      id: enquiries.id,
      userId: enquiries.userId,
      quantity: enquiries.quantity,
      country: enquiries.country,
      incoterm: enquiries.incoterm,
      message: enquiries.message,
      createdAt: enquiries.createdAt,
      title: listings.title,
      supplierId: listings.supplierId,
    })
    .from(enquiries)
    .innerJoin(listings, eq(enquiries.listingId, listings.id))
    .where(and(eq(enquiries.id, enquiryId), eq(enquiries.kind, "listing_quote")))
    .limit(1);
  if (!e) return null;
  const [t] = await db
    .insert(threads)
    .values({ enquiryId, buyerUserId: e.userId, supplierId: e.supplierId, subject: `Quote: ${e.title}`, lastMessageAt: e.createdAt, createdAt: e.createdAt })
    .onConflictDoNothing({ target: threads.enquiryId })
    .returning({ id: threads.id });
  if (!t) {
    const [again] = await db.select({ id: threads.id }).from(threads).where(eq(threads.enquiryId, enquiryId)).limit(1);
    return again?.id ?? null;
  }
  const lines = [
    `Quote requested for ${e.title}.`,
    e.quantity && `Quantity: ${e.quantity}`,
    e.country && `Destination: ${e.country}`,
    e.incoterm && `Incoterm: ${e.incoterm}`,
    e.message && `Notes: ${e.message}`,
  ].filter(Boolean);
  await db.insert(messages).values({ threadId: t.id, authorRole: "system", body: lines.join("\n"), createdAt: e.createdAt });
  return t.id;
}

export function makeOfferRef() {
  const d = new Date();
  return `OF-${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Normalises an offer price to USD per metric tonne for comparison. */
export function usdPerMt(o: Pick<Offer, "price" | "currency" | "unit">, usdInr: number) {
  const perUnit = o.currency === "INR" ? o.price / usdInr : o.price;
  return o.unit === "kg" ? perUnit * 1000 : perUnit;
}

/**
 * After a buyer confirms their email, attach anything they submitted with that
 * email while signed out (buying requests, quote requests and their conversations).
 */
export async function claimByEmail(userId: string, email: string) {
  const db = getDb();
  await db.update(rfqs).set({ userId }).where(and(isNull(rfqs.userId), sql`lower(${rfqs.buyerEmail}) = ${email.toLowerCase()}`));
  await db
    .update(enquiries)
    .set({ userId })
    .where(and(isNull(enquiries.userId), eq(enquiries.kind, "listing_quote"), sql`lower(${enquiries.email}) = ${email.toLowerCase()}`));
  await db.execute(sql`
    update impexsphere.threads t set buyer_user_id = ${userId}
    where t.buyer_user_id is null and (
      t.enquiry_id in (select id from impexsphere.enquiries where user_id = ${userId})
      or t.offer_id in (select o.id from impexsphere.offers o join impexsphere.rfqs r on r.id = o.rfq_id where r.user_id = ${userId})
    )`);
}

/** Serializable offer for the UI, with a USD/MT figure for comparison. */
export async function offerViews(rows: Offer[]) {
  const { USD_INR } = await import("./format");
  const supIds = [...new Set(rows.map((r) => r.supplierId))];
  const sups = supIds.length
    ? await getDb().select({ id: suppliers.id, name: suppliers.name, slug: suppliers.slug, status: suppliers.status }).from(suppliers).where(inArray(suppliers.id, supIds))
    : [];
  return rows.map((o) => {
    const s = sups.find((x) => x.id === o.supplierId);
    return {
      id: o.id,
      ref: o.ref,
      price: o.price,
      currency: o.currency,
      unit: o.unit,
      quantity: o.quantity,
      incoterm: o.incoterm,
      port: o.port,
      leadTimeDays: o.leadTimeDays,
      validUntil: o.validUntil?.toISOString() ?? null,
      notes: o.notes,
      status: o.status,
      buyerNote: o.buyerNote,
      adminNote: o.adminNote,
      supplierName: s?.name ?? "Supplier",
      supplierSlug: s?.status === "approved" ? s.slug : null,
      usdMt: usdPerMt(o, USD_INR),
      createdAt: o.createdAt.toISOString(),
    };
  });
}

/** Thread id for each offer (RFQ offers have their own thread; listing quotes share the quote's thread). */
export async function threadIdsForOffers(rows: Pick<Offer, "id" | "rfqId" | "enquiryId">[]) {
  const map = new Map<string, string>();
  if (!rows.length) return map;
  const ts = await getDb()
    .select({ id: threads.id, offerId: threads.offerId, enquiryId: threads.enquiryId })
    .from(threads)
    .where(
      or(
        inArray(threads.offerId, rows.map((r) => r.id)),
        inArray(threads.enquiryId, rows.map((r) => r.enquiryId).filter((x): x is string => !!x).concat(["00000000-0000-0000-0000-000000000000"])),
      ),
    );
  for (const r of rows) {
    const t = ts.find((x) => x.offerId === r.id) ?? (r.enquiryId ? ts.find((x) => x.enquiryId === r.enquiryId) : undefined);
    if (t) map.set(r.id, t.id);
  }
  return map;
}
