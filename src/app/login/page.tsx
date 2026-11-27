import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { SignInForm } from "@/components/AuthForms";
import { getCurrentUser, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(next));
  return (
    <AuthShell
      title={<>Welcome <span className="serif gold-text">back.</span></>}
      sub="Sign in to manage your listings, requests and offers."
      foot={<>New to ImpexSphere? <Link href="/signup" className="link">Create an account</Link></>}
    >
      <SignInForm next={next} />
    </AuthShell>
  );
}
