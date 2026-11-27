import { notFound, redirect } from "next/navigation";
import { openQuoteThread } from "@/app/actions/offers";

/** Opens the conversation for a quote request (creating it on first visit). */
export default async function OpenQuote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const threadId = await openQuoteThread(id);
  if (!threadId) notFound();
  redirect(`/messages/${threadId}`);
}
