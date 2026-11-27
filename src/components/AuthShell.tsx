import Link from "next/link";
import { Reveal } from "./fx";

/** Centered card layout for sign-in / sign-up / reset pages. */
export default function AuthShell({ title, sub, children, foot }: { title: React.ReactNode; sub?: React.ReactNode; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <section className="auth-wrap">
      <Reveal>
        <div className="card auth-card">
          <div className="auth-glow" aria-hidden />
          <h1>{title}</h1>
          {sub && <p className="muted">{sub}</p>}
          {children}
        </div>
        {foot && <p className="auth-foot">{foot}</p>}
        <p className="auth-foot" style={{ marginTop: 6 }}>
          <Link href="/" className="link">← Back to the marketplace</Link>
        </p>
      </Reveal>
    </section>
  );
}
