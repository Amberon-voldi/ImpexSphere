import type { Metadata } from "next";
import { InboxList } from "@/components/messaging";
import { requireUser } from "@/lib/auth";
import { inbox } from "@/lib/messaging";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(undefined, "/messages");
  const items = await inbox(user);
  return (
    <section className="dash">
      <div className="container">
        <div className="msg-layout">
          <InboxList items={items} />
          <div className="msg-main">{children}</div>
        </div>
      </div>
    </section>
  );
}
