import { NextResponse } from "next/server";

const KINDS = { quote: "Quote request", supplier: "Supplier registration", contact: "Contact message" } as const;
type Kind = keyof typeof KINDS;

const FIELDS = [
  "name", "company", "email", "phone", "commodity", "country", "location",
  "quantity", "incoterm", "capacity", "service", "message",
] as const;

const REQUIRED: Record<Kind, (typeof FIELDS)[number][]> = {
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

  // Honeypot: silently accept bot submissions without delivering them.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const kind = body.kind as Kind;
  if (!(kind in KINDS)) return NextResponse.json({ error: "Invalid form." }, { status: 400 });

  const data: Partial<Record<(typeof FIELDS)[number], string>> = {};
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

  const subject = `[ImpexSphere] ${KINDS[kind]} — ${data.company}${data.commodity ? ` · ${data.commodity}` : ""}`;
  const rows = FIELDS.filter((f) => data[f]).map((f) => [f, data[f]!] as const);
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html = `<h2>${escapeHtml(KINDS[kind])}</h2><table cellpadding="6">${rows
    .map(([k, v]) => `<tr><th align="left" valign="top">${k}</th><td>${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("")}</table>`;

  const { RESEND_API_KEY, ENQUIRY_TO_EMAIL, ENQUIRY_FROM_EMAIL } = process.env;

  if (!RESEND_API_KEY || !ENQUIRY_TO_EMAIL) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n--- ${subject} ---\n${text}\n`);
      return NextResponse.json({ ok: true });
    }
    console.error("Enquiry delivery is not configured (RESEND_API_KEY / ENQUIRY_TO_EMAIL).");
    return NextResponse.json(
      { error: "Our enquiry system is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

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
  });

  if (!res.ok) {
    console.error("Resend error", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: "We couldn't send your message. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
