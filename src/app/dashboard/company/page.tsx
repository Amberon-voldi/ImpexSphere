import type { Metadata } from "next";
import Link from "next/link";
import { CompanyForm } from "@/components/dashboard";
import { requireSupplier } from "@/lib/auth";
import { levelLabel } from "@/lib/format";
import { getSupplierRow } from "@/lib/supplierData";

export const metadata: Metadata = { title: "Company profile" };

export default async function CompanyPage() {
  const user = await requireSupplier("/dashboard/company");
  const s = await getSupplierRow(user.supplier.id);
  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Company profile</span>
          <h1 className="dash-h1">{s.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Verification: <b>{levelLabel[s.level]}</b>
            {s.status === "approved" && (
              <> · <Link href={`/suppliers/${s.slug}`} className="link" target="_blank">View public profile ↗</Link></>
            )}
          </p>
        </div>
      </div>
      <div className="card panel" style={{ maxWidth: 760 }}>
        <CompanyForm c={s} />
      </div>
    </>
  );
}
