import Link from "next/link";
import Icon from "@/components/Icon";
import { getCurrentUser } from "@/lib/auth";

export default async function MessagesHome() {
  const user = await getCurrentUser();
  return (
    <div className="msg-empty">
      <div className="msg-empty-ic"><Icon name="doc" size={30} /></div>
      <h2>Your conversations</h2>
      <p className="muted">
        {user?.supplier
          ? "Buyers' quote requests and your offers on buying requests each get a conversation here, with the ImpexSphere trade desk in the loop."
          : "When you request a quote or receive an offer, the conversation with the supplier and our trade desk appears here."}
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {user?.supplier ? (
          <Link href="/dashboard/rfqs" className="btn btn-gold">Browse buying requests</Link>
        ) : (
          <>
            <Link href="/marketplace" className="btn btn-gold">Browse the marketplace</Link>
            <Link href="/rfq#post" className="btn">Post a buying request</Link>
          </>
        )}
      </div>
    </div>
  );
}
