import { count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import DashShell from "@/components/DashShell";
import { enquiries, getDb, rfqs, suppliers } from "@/db";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser("admin", "/admin");
  const db = getDb();
  const [[ps], [pr], [ne]] = await Promise.all([
    db.select({ n: count() }).from(suppliers).where(eq(suppliers.status, "pending")),
    db.select({ n: count() }).from(rfqs).where(eq(rfqs.status, "pending")),
    db.select({ n: count() }).from(enquiries).where(eq(enquiries.status, "new")),
  ]);
  return (
    <DashShell
      id="adm"
      title="Admin console"
      subtitle="ImpexSphere trade desk"
      nav={[
        { href: "/admin", label: "Overview", icon: "grid" },
        { href: "/admin/enquiries", label: "Enquiries", icon: "doc", badge: ne.n },
        { href: "/admin/rfqs", label: "Buying requests", icon: "bolt", badge: pr.n },
        { href: "/admin/suppliers", label: "Suppliers", icon: "shield", badge: ps.n },
        { href: "/admin/listings", label: "Listings", icon: "box" },
        { href: "/admin/users", label: "Users", icon: "star" },
      ]}
    >
      {children}
    </DashShell>
  );
}
