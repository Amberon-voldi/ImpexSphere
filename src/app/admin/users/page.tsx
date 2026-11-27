import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { setUser } from "@/app/actions/admin";
import { AutoSelect } from "@/components/dashboard";
import { getDb, suppliers, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { ago } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsers() {
  const me = await requireUser("admin");
  const rows = await getDb()
    .select({ u: users, supplier: suppliers.name })
    .from(users)
    .leftJoin(suppliers, eq(users.supplierId, suppliers.id))
    .orderBy(desc(users.createdAt))
    .limit(500);
  return (
    <>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Users</span>
          <h1 className="dash-h1">Accounts</h1>
          <p className="muted" style={{ margin: 0 }}>Emails listed in ADMIN_EMAILS become admins when they sign up. Disabling an account signs it out everywhere.</p>
        </div>
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Company</th><th>Joined</th><th>Last sign-in</th><th>Role</th><th>Access</th></tr>
          </thead>
          <tbody>
            {rows.map(({ u, supplier }) => (
              <tr key={u.id}>
                <td>{u.name}{u.id === me.id && <span className="muted"> (you)</span>}</td>
                <td>
                  {u.email} {u.emailVerifiedAt ? <span className="up" title="Email confirmed">✓</span> : <span className="muted" title="Not confirmed">·</span>}
                </td>
                <td>{supplier ?? "—"}</td>
                <td className="muted">{ago(u.createdAt.toISOString())}</td>
                <td className="muted">{u.lastLoginAt ? ago(u.lastLoginAt.toISOString()) : "—"}</td>
                <td>
                  {u.id === me.id ? (
                    <span style={{ textTransform: "capitalize" }}>{u.role}</span>
                  ) : (
                    <form action={setUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <AutoSelect name="role" value={u.role} options={[["buyer", "Buyer"], ["supplier", "Supplier"], ["admin", "Admin"]]} label="Role" />
                    </form>
                  )}
                </td>
                <td>
                  {u.id === me.id ? (
                    "—"
                  ) : (
                    <form action={setUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <AutoSelect name="disabled" value={u.disabled ? "1" : "0"} options={[["0", "Active"], ["1", "Disabled"]]} label="Access" />
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
