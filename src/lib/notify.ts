import "server-only";
import { escapeHtml, sendEmail } from "./email";

/** Emails the trade desk about a new submission. No-op unless email is configured. */
export async function notify(subject: string, heading: string, data: Record<string, string | undefined>, ref: string) {
  const to = process.env.ENQUIRY_TO_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return;

  const rows = Object.entries(data).filter((e): e is [string, string] => !!e[1]);
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nRef: ${ref}`;
  const html = `<h2>${escapeHtml(heading)}</h2><table cellpadding="6">${rows
    .map(([k, v]) => `<tr><th align="left" valign="top">${escapeHtml(k)}</th><td>${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("")}</table><p style="color:#888">Ref: ${escapeHtml(ref)}</p>`;

  await sendEmail({
    to: to.split(",").map((s) => s.trim()),
    subject: `[ImpexSphere] ${subject}`,
    text,
    html,
    replyTo: data.email,
  });
}
