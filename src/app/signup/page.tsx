import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { SignUpForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const { role } = await searchParams;
  return (
    <AuthShell
      title={<>Join the <span className="serif gold-text">marketplace.</span></>}
      sub="Free for buyers and suppliers."
      foot={<>Already have an account? <Link href="/login" className="link">Sign in</Link></>}
    >
      <SignUpForm initialRole={role === "supplier" ? "supplier" : "buyer"} />
    </AuthShell>
  );
}
