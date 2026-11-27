import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadMessages, markRead } from "@/lib/messaging";

export const dynamic = "force-dynamic";

/** New messages in a conversation since `after` (used for live updates). Marks the thread read. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const afterRaw = new URL(req.url).searchParams.get("after");
  const after = afterRaw ? new Date(afterRaw) : undefined;
  const data = await loadMessages(user, id, after && !isNaN(+after) ? after : undefined);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (data.messages.length) await markRead(user, id);
  return NextResponse.json(
    { messages: data.messages, offers: data.thread.offers.map((o) => ({ id: o.id, status: o.status })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
