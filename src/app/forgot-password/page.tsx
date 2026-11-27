import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { ForgotForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      sub="Enter your email and we'll send you a link to choose a new one."
      foot={<>Remembered it? <Link href="/login" className="link">Sign in</Link></>}
    >
      <ForgotForm />
    </AuthShell>
  );
}
