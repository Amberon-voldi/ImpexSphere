"use client";

import { useActionState } from "react";
import { changePassword, resendVerification, signOut, updateProfile } from "@/app/actions/auth";
import { FormMessage, PasswordField, SubmitButton } from "./ui";

export function ProfileForm({ name, phone, email }: { name: string; phone: string | null; email: string }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="form">
      <div className="form-row">
        <div className="field">
          <label htmlFor="p-name">Name</label>
          <input id="p-name" name="name" required defaultValue={name} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="p-phone">
            Phone / WhatsApp <span className="opt">(optional)</span>
          </label>
          <input id="p-phone" name="phone" type="tel" defaultValue={phone ?? ""} autoComplete="tel" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="p-email">Email</label>
        <input id="p-email" value={email} disabled readOnly />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn" pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="form">
      <PasswordField name="current" label="Current password" autoComplete="current-password" />
      <PasswordField label="New password" meter autoComplete="new-password" />
      <FormMessage state={state} />
      <SubmitButton className="btn" pendingText="Saving…">Change password</SubmitButton>
    </form>
  );
}

export function ResendVerification() {
  const [state, action] = useActionState(resendVerification, undefined);
  return (
    <form action={action} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <SubmitButton className="btn btn-sm" pendingText="Sending…">Resend confirmation email</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function SignOutButton({ className = "btn btn-sm btn-ghost" }: { className?: string }) {
  return (
    <form action={signOut}>
      <button className={className} type="submit">Sign out</button>
    </form>
  );
}
