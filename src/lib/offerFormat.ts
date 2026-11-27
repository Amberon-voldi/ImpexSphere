import type { Offer } from "@/db/schema";

/** Plain-text summary of an offer, used in conversation and email messages. */
export function formatOffer(o: Pick<Offer, "ref" | "price" | "currency" | "unit" | "quantity" | "incoterm" | "port" | "leadTimeDays" | "validUntil" | "notes">) {
  const price = `${o.currency === "INR" ? "₹" : "US$"}${o.price.toLocaleString(o.currency === "INR" ? "en-IN" : "en-US")} / ${o.unit}`;
  return [
    `Offer ${o.ref}: ${price}`,
    `Quantity: ${o.quantity}`,
    o.incoterm && `Terms: ${o.incoterm}${o.port ? ` ${o.port}` : ""}`,
    o.leadTimeDays != null && `Dispatch: ${o.leadTimeDays} days`,
    o.validUntil && `Valid until: ${o.validUntil.toISOString().slice(0, 10)}`,
    o.notes && `Notes: ${o.notes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** "US$3,050" / "₹268" (without the unit). Safe to use on server and client. */
export function offerPriceLabel(o: Pick<Offer, "price" | "currency">) {
  return `${o.currency === "INR" ? "₹" : "US$"}${o.price.toLocaleString(o.currency === "INR" ? "en-IN" : "en-US")}`;
}
