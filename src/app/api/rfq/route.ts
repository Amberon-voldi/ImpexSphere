import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories, getDb, rfqs } from "@/db";
import { notify } from "@/lib/notify";
import { clean, clientMeta, EMAIL_RE } from "@/lib/validate";

const FIELDS = [
  "commodity", "category", "specs", "quantity", "destination", "incoterm", "targetPrice", "deliveryBy",
  "name", "company", "email", "phone",
] as const;
const REQUIRED = ["commodity", "quantity", "destination", "name", "company", "email"] as const;

function makeRef() {
  const d = new Date();
  const ym = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RFQ-${ym}-${rnd}`;
}

/** Saves a buying request. It stays `pending` (not public) until the trade desk opens it. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true, ref: makeRef() });

  const data = clean(body, FIELDS);
  const missing = REQUIRED.filter((f) => !data[f]);
  if (missing.length) return NextResponse.json({ error: `Please fill in: ${missing.join(", ")}.` }, { status: 400 });
  if (!EMAIL_RE.test(data.email!)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

  try {
    const db = getDb();
    let categoryId: string | null = null;
    if (data.category) {
      const [c] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, data.category)).limit(1);
      categoryId = c?.id ?? null;
    }

    let row: { id: string; ref: string } | undefined;
    for (let attempt = 0; attempt < 4 && !row; attempt++) {
      [row] = await db
        .insert(rfqs)
        .values({
          ref: makeRef(),
          categoryId,
          commodity: data.commodity!,
          specs: data.specs,
          quantity: data.quantity!,
          destination: data.destination!,
          incoterm: data.incoterm,
          targetPrice: data.targetPrice,
          deliveryBy: data.deliveryBy,
          buyerName: data.name!,
          buyerCompany: data.company!,
          buyerEmail: data.email!.toLowerCase(),
          buyerPhone: data.phone,
          ...clientMeta(req),
        })
        .onConflictDoNothing({ target: rfqs.ref })
        .returning({ id: rfqs.id, ref: rfqs.ref });
    }
    if (!row) throw new Error("Could not allocate an RFQ reference");

    await notify(`Buying request ${row.ref} — ${data.company} · ${data.commodity}`, `New buying request ${row.ref}`, data, row.id).catch((err) =>
      console.error("RFQ notification failed", err),
    );
    return NextResponse.json({ ok: true, ref: row.ref });
  } catch (err) {
    console.error("Failed to save RFQ", err);
    return NextResponse.json({ error: "We couldn't save your request. Please try again shortly." }, { status: 503 });
  }
}
