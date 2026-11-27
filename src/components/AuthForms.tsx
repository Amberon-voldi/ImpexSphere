"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { requestPasswordReset, resetPassword, signIn, signUp } from "@/app/actions/auth";
import Icon from "./Icon";
import { FormMessage, PasswordField, SubmitButton } from "./ui";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="field">
        <label htmlFor="f-email">Email</label>
        <input id="f-email" name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} />
      </div>
      <PasswordField autoComplete="current-password" />
      <div style={{ textAlign: "right", marginTop: -6 }}>
        <Link href="/forgot-password" className="link">Forgot password?</Link>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Signing in…">
        Sign in <Icon name="arrow" size={16} className="arrow" />
      </SubmitButton>
    </form>
  );
}

export function SignUpForm({ initialRole }: { initialRole: "buyer" | "supplier" }) {
  const [state, action] = useActionState(signUp, undefined);
  const [role, setRole] = useState<"buyer" | "supplier">((state?.values?.role as "buyer" | "supplier") || initialRole);
  const v = state?.values ?? {};
  return (
    <form action={action} className="form">
      <input type="hidden" name="role" value={role} />
      <div className="role-pick" role="radiogroup" aria-label="Account type">
        {(
          [
            ["buyer", "I'm buying", "Post buying requests, track quotes and offers"],
            ["supplier", "I'm selling", "List commodities, manage stock and prices"],
          ] as const
        ).map(([k, t, d]) => (
          <button type="button" key={k} role="radio" aria-checked={role === k} className="role-opt" onClick={() => setRole(k)}>
            {role === k && <motion.span layoutId="role-pill" className="role-bg" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <b>{t}</b>
            <span>{d}</span>
          </button>
        ))}
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="f-name">Your name</label>
          <input id="f-name" name="name" required autoComplete="name" defaultValue={v.name} />
        </div>
        <div className="field">
          <label htmlFor="f-phone">
            Phone / WhatsApp <span className="opt">(optional)</span>
          </label>
          <input id="f-phone" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="f-email">Work email</label>
        <input id="f-email" name="email" type="email" required autoComplete="email" defaultValue={v.email} />
      </div>
      <AnimatePresence initial={false}>
        {role === "supplier" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div className="form" style={{ paddingTop: 2 }}>
              <div className="field">
                <label htmlFor="f-company">Company name</label>
                <input id="f-company" name="company" required autoComplete="organization" defaultValue={v.company} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="f-city">City</label>
                  <input id="f-city" name="city" required autoComplete="address-level2" defaultValue={v.city} />
                </div>
                <div className="field">
                  <label htmlFor="f-state">State</label>
                  <input id="f-state" name="state" required autoComplete="address-level1" defaultValue={v.state} />
                </div>
              </div>
              <p className="fine">Your company profile and listings go live once our team has verified you.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <PasswordField meter autoComplete="new-password" />
      <label className="check-row">
        <input type="checkbox" name="terms" required /> I agree to be contacted about my account and trades.
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Creating account…">
        Create account <Icon name="arrow" size={16} className="arrow" />
      </SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="f-email">Email</label>
        <input id="f-email" name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="form">
      <input type="hidden" name="token" value={token} />
      <PasswordField label="New password" meter autoComplete="new-password" />
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Set new password</SubmitButton>
    </form>
  );
}
