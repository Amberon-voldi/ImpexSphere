"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/auth";
import Icon from "./Icon";

export function SubmitButton({ children, className = "btn btn-gold btn-block", pendingText = "Working…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? (
        <>
          <span className="spinner" /> {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  return (
    <AnimatePresence mode="wait">
      {state?.error && (
        <motion.div key={state.error} className="form-error" role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {state.error}
        </motion.div>
      )}
      {state?.ok && (
        <motion.div key={state.ok} className="form-ok" role="status" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <Icon name="check" size={15} stroke={2.6} /> {state.ok}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 10) s++;
  if (pw.length >= 14) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
const colors = ["var(--down)", "var(--down)", "#f0a81c", "var(--up)", "var(--up)"];

export function PasswordField({ name = "password", label = "Password", meter, autoComplete }: { name?: string; label?: string; meter?: boolean; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  const [v, setV] = useState("");
  const s = v.length < 10 ? 0 : strength(v);
  return (
    <div className="field">
      <label htmlFor={`f-${name}`}>{label}</label>
      <div className="pw-wrap">
        <input id={`f-${name}`} name={name} type={show ? "text" : "password"} required value={v} onChange={(e) => setV(e.target.value)} autoComplete={autoComplete} minLength={meter ? 10 : undefined} />
        <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {meter && (
        <div className="pw-meter" aria-live="polite">
          <div className="bars">
            {[0, 1, 2, 3].map((i) => (
              <motion.span key={i} animate={{ background: v && i < Math.max(1, s) ? colors[s] : "var(--line)" }} />
            ))}
          </div>
          <span style={{ color: v ? colors[s] : "var(--muted)" }}>{v ? labels[s] : "At least 10 characters"}</span>
        </div>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill-${status}`}>{status.replace(/_/g, " ")}</span>;
}
