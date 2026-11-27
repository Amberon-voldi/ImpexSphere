export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Picks string fields from a request body, trimmed and length-capped. */
export function clean<F extends string>(body: Record<string, unknown>, fields: readonly F[]) {
  const data: Partial<Record<F, string>> = {};
  for (const f of fields) {
    const v = body[f];
    if (typeof v === "string" && v.trim()) data[f] = v.trim().slice(0, f === "message" || f === "specs" ? 5000 : 300);
  }
  return data;
}

export function clientMeta(req: Request) {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent")?.slice(0, 500) || null,
  };
}
