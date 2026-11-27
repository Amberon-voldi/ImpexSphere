import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { ResetForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password" foot={<Link href="/forgot-password" className="link">Request a new link</Link>}>
      {token ? <ResetForm token={token} /> : <div className="form-error">This link is missing its token. Request a new one.</div>}
    </AuthShell>
  );
}
