import { NextResponse } from "next/server";
import { enquiries, getDb, type NewEnquiry } from "@/db";

const KINDS = { quote: "Quote request", supplier: "Supplier registration", contact: "Contact message" } as const;
type Kind = keyof typeof KINDS;

const FIELDS = [
  "name", "company", "email", "phone", "commodity", "country", "location",
  "quantity", "incoterm", "capacity", "service", "message",
] as const;
type Field = (typeof FIELDS)[number];

const REQUIRED: Record<Kind, Field[]> = {
  quote: ["name", "company", "email", "commodity", "country", "quantity"],
  supplier: ["name", "company", "email", "commodity", "location", "capacity", "service"],
  contact: ["name", "company", "email", "message"],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: silently accept bot submissions without storing them.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const kind = body.kind as Kind;
  if (typeof kind !== "string" || !(kind in KINDS)) {
    return NextResponse.json({ error: "Invalid form." }, { status: 400 });
  }

  const data: Partial<Record<Field, string>> = {};
  for (const f of FIELDS) {
    const v = body[f];
    if (typeof v === "string" && v.trim()) data[f] = v.trim().slice(0, f === "message" ? 5000 : 300);
  }

  const missing = REQUIRED[kind].filter((f) => !data[f]);
  if (missing.length) {
    return NextResponse.json({ error: `Please fill in: ${missing.join(", ")}.` }, { status: 400 });
  }
  if (!EMAIL_RE.test(data.email!)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  // 1. Persist — this is the source of truth.
  const record: NewEnquiry = {
    kind,
    name: data.name!,
    company: data.company!,
    email: data.email!.toLowerCase(),
    phone: data.phone,
    commodity: data.commodity,
    message: data.message,
    country: data.country,
    quantity: data.quantity,
    incoterm: data.incoterm,
    location: data.location,
    capacity: data.capacity,
    service: data.service,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent")?.slice(0, 500) || null,
  };

  let id: string;
  try {
    const [row] = await getDb().insert(enquiries).values(record).returning({ id: enquiries.id });
    id = row.id;
  } catch (err) {
    console.error("Failed to save enquiry", err);
    return NextResponse.json(
      { error: "We couldn't save your submission. Please try again shortly." },
      { status: 503 },
    );
  }

  // 2. Notify by email (optional; never fails the request).
  await notify(kind, data, id).catch((err) => console.error("Enquiry notification failed", err));

  return NextResponse.json({ ok: true, id });
}

async function notify(kind: Kind, data: Partial<Record<Field, string>>, id: string) {
  const { RESEND_API_KEY, ENQUIRY_TO_EMAIL, ENQUIRY_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !ENQUIRY_TO_EMAIL) return;

  const subject = `[ImpexSphere] ${KINDS[kind]} — ${data.company}${data.commodity ? ` · ${data.commodity}` : ""}`;
  const rows = FIELDS.filter((f) => data[f]).map((f) => [f, data[f]!] as const);
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nRef: ${id}`;
  const html = `<h2>${escapeHtml(KINDS[kind])}</h2><table cellpadding="6">${rows
    .map(([k, v]) => `<tr><th align="left" valign="top">${k}</th><td>${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("")}</table><p style="color:#888">Ref: ${id}</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: ENQUIRY_FROM_EMAIL || "ImpexSphere <onboarding@resend.dev>",
      to: ENQUIRY_TO_EMAIL.split(",").map((s) => s.trim()),
      reply_to: data.email,
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text().catch(() => "")}`);
}
