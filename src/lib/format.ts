/** Indicative INR→USD rate for showing export-equivalent prices. Update as needed. */
export const USD_INR = 84;

export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: n < 100 ? 2 : 0 });

/** ₹/kg → USD per metric tonne. */
export const usdMt = (inrKg: number) => "$" + Math.round((inrKg * 1000) / USD_INR).toLocaleString("en-US");

export function qty(kg: number) {
  if (kg >= 1000) {
    const t = kg / 1000;
    return `${t >= 100 ? Math.round(t) : t.toLocaleString("en-US", { maximumFractionDigits: 1 })} MT`;
  }
  return `${kg.toLocaleString("en-IN")} kg`;
}

export const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const levelLabel = { listed: "Listed", verified: "Verified", trusted: "Trusted partner" } as const;
