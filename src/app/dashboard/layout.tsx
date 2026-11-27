import type { Metadata } from "next";
import Link from "next/link";
import DashShell from "@/components/DashShell";
import { requireSupplier } from "@/lib/auth";
import { unreadCount } from "@/lib/messaging";

export const metadata: Metadata = { title: { default: "Supplier dashboard", template: "%s · Supplier dashboard" }, robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSupplier("/dashboard");
  const s = user.supplier;
  const unread = await unreadCount(user).catch(() => 0);
  return (
    <DashShell
      id="sup"
      title={s.name}
      subtitle={<span className={`pill pill-${s.status}`}>{s.status === "approved" ? "Verified & live" : s.status === "pending" ? "Awaiting verification" : "Suspended"}</span>}
      nav={[
        { href: "/dashboard", label: "Overview", icon: "grid" },
        { href: "/dashboard/listings", label: "Listings", icon: "box" },
        { href: "/dashboard/requests", label: "Quote requests", icon: "doc" },
        { href: "/dashboard/rfqs", label: "Buying requests", icon: "bolt" },
        { href: "/dashboard/offers", label: "My offers", icon: "compare" },
        { href: "/messages", label: "Messages", icon: "sparkle", badge: unread },
        { href: "/dashboard/company", label: "Company profile", icon: "shield" },
        { href: "/account", label: "Account", icon: "star" },
      ]}
    >
      {s.status === "pending" && (
        <div className="card banner">
          <div>
            <b>Your company is being verified</b>
            <p className="muted" style={{ margin: 0 }}>
              You can add listings now. They&apos;ll appear on the marketplace once our team approves your profile. Complete your{" "}
              <Link href="/dashboard/company" className="link">company profile</Link> to speed things up.
            </p>
          </div>
        </div>
      )}
      {s.status === "suspended" && (
        <div className="card banner banner-bad">
          <div>
            <b>Your company is suspended</b>
            <p className="muted" style={{ margin: 0 }}>Your listings are hidden from buyers. <Link href="/contact" className="link">Contact us</Link> to resolve this.</p>
          </div>
        </div>
      )}
      {children}
    </DashShell>
  );
}
