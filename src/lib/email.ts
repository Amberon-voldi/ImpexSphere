import "server-only";

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

/** Sends an email through Resend. Returns false (and logs) when email isn't configured. */
export async function sendEmail(opts: { to: string | string[]; subject: string; text: string; html: string; replyTo?: string }) {
  const { RESEND_API_KEY, ENQUIRY_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set; not sent: "${opts.subject}"`);
    if (process.env.NODE_ENV !== "production") console.warn(opts.text);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: ENQUIRY_FROM_EMAIL || "ImpexSphere <onboarding@resend.dev>",
      to: opts.to,
      reply_to: opts.replyTo,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text().catch(() => "")}`);
  return true;
}

/** Simple branded email with one call-to-action link. */
export function actionEmail(heading: string, body: string, cta: string, url: string) {
  return {
    text: `${heading}\n\n${body}\n\n${cta}: ${url}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f1a33">
<h2 style="margin:0 0 12px">${escapeHtml(heading)}</h2>
<p style="color:#5b6478;line-height:1.6">${escapeHtml(body)}</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#d9b56b;color:#1b1305;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">${escapeHtml(cta)}</a></p>
<p style="color:#8790aa;font-size:13px">If you didn't request this, you can ignore this email.</p></div>`,
  };
}
