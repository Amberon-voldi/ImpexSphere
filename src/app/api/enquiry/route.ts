import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { enquiries, getDb, listings, rfqs, suppliers, type NewEnquiry } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { clean, clientMeta, EMAIL_RE } from "@/lib/validate";

const KINDS = {
  listing_quote: "Quote request",
  rfq_offer: "Offer on buying request",
  supplier_application: "Supplier application",
  contact: "Contact message",
} as const;
type Kind = keyof typeof KINDS;

const FIELDS = [
  "name", "company", "email", "phone", "commodity", "quantity", "country", "incoterm",
  "location", "capacity", "service", "message",
] as const;

const REQUIRED: Record<Kind, (typeof FIELDS)[number][]> = {
  listing_quote: ["name", "company", "email", "quantity", "country"],
  rfq_offer: ["name", "company", "email", "location", "message"],
  supplier_application: ["name", "company", "email", "commodity", "location", "capacity", "service"],
  contact: ["name", "company", "email", "message"],
};

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: silently accept bot submissions without storing them.
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const kind = body.kind as Kind;
  if (typeof kind !== "string" || !(kind in KINDS)) return NextResponse.json({ error: "Invalid form." }, { status: 400 });

  const data = clean(body, FIELDS);
  const missing = REQUIRED[kind].filter((f) => !data[f]);
  if (missing.length) return NextResponse.json({ error: `Please fill in: ${missing.join(", ")}.` }, { status: 400 });
  if (!EMAIL_RE.test(data.email!)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

  const db = getDb();
  let listingId: string | null = null;
  let rfqId: string | null = null;
  let context = "";
  try {
    if (kind === "listing_quote" && typeof body.listing === "string") {
      const [l] = await db
        .select({ id: listings.id, title: listings.title })
        .from(listings)
        .innerJoin(suppliers, eq(listings.supplierId, suppliers.id))
        .where(and(eq(listings.slug, body.listing), eq(listings.status, "active"), eq(suppliers.status, "approved")))
        .limit(1);
      if (!l) return NextResponse.json({ error: "That listing is no longer available." }, { status: 404 });
      listingId = l.id;
      data.commodity ??= l.title;
      context = l.title;
    }
    if (kind === "rfq_offer" && typeof body.rfq === "string") {
      const [r] = await db
        .select({ id: rfqs.id, commodity: rfqs.commodity, ref: rfqs.ref })
        .from(rfqs)
        .where(and(eq(rfqs.ref, body.rfq), eq(rfqs.status, "open")))
        .limit(1);
      if (!r) return NextResponse.json({ error: "That buying request is no longer open." }, { status: 404 });
      rfqId = r.id;
      data.commodity ??= r.commodity;
      context = `${r.ref} · ${r.commodity}`;
    }

    const user = await getCurrentUser();
    const record: NewEnquiry = {
      kind,
      userId: user?.id ?? null,
      supplierId: kind === "rfq_offer" ? (user?.supplierId ?? null) : null,
      listingId,
      rfqId,
      name: data.name!,
      company: data.company!,
      email: data.email!.toLowerCase(),
      phone: data.phone,
      commodity: data.commodity,
      quantity: data.quantity,
      country: data.country,
      incoterm: data.incoterm,
      location: data.location,
      capacity: data.capacity,
      service: data.service,
      message: data.message,
      ...clientMeta(req),
    };
    const [row] = await db.insert(enquiries).values(record).returning({ id: enquiries.id });

    await notify(`${KINDS[kind]} — ${data.company}${context ? ` · ${context}` : data.commodity ? ` · ${data.commodity}` : ""}`, KINDS[kind], data, row.id).catch((err) =>
      console.error("Enquiry notification failed", err),
    );
    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    console.error("Failed to save enquiry", err);
    return NextResponse.json({ error: "We couldn't save your submission. Please try again shortly." }, { status: 503 });
  }
}
