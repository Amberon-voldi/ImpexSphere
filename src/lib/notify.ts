import "server-only";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Emails the trade desk about a new submission via Resend. No-op unless configured. */
export async function notify(subject: string, heading: string, data: Record<string, string | undefined>, ref: string) {
  const { RESEND_API_KEY, ENQUIRY_TO_EMAIL, ENQUIRY_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !ENQUIRY_TO_EMAIL) return;

  const rows = Object.entries(data).filter((e): e is [string, string] => !!e[1]);
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nRef: ${ref}`;
  const html = `<h2>${escapeHtml(heading)}</h2><table cellpadding="6">${rows
    .map(([k, v]) => `<tr><th align="left" valign="top">${escapeHtml(k)}</th><td>${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("")}</table><p style="color:#888">Ref: ${escapeHtml(ref)}</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: ENQUIRY_FROM_EMAIL || "ImpexSphere <onboarding@resend.dev>",
      to: ENQUIRY_TO_EMAIL.split(",").map((s) => s.trim()),
      reply_to: data.email,
      subject: `[ImpexSphere] ${subject}`,
      text,
      html,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text().catch(() => "")}`);
}
