import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import { Conversation, OfferCard, SupplierOfferForm } from "@/components/messaging";
import { requireUser } from "@/lib/auth";
import { inr } from "@/lib/format";
import { loadMessages, markRead, offerViews } from "@/lib/messaging";

export const metadata: Metadata = { title: "Conversation" };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(undefined, `/messages/${id}`);
  const data = await loadMessages(user, id);
  if (!data || !data.thread.as) notFound();
  await markRead(user, id);
  const t = data.thread;
  const as = t.as!;
  const views = await offerViews(t.offers);
  const rfqOffer = t.offerId ? t.offers[0] : null;
  const closed = !!rfqOffer && ["withdrawn", "rejected"].includes(rfqOffer.status);
  const canPost = as === "admin" || !closed;
  const others =
    as === "buyer"
      ? `${t.supplierName ?? "Supplier"} and the ImpexSphere trade desk`
      : as === "supplier"
        ? `${t.buyerLabel} and the ImpexSphere trade desk`
        : `${t.buyerLabel} · ${t.supplierName ?? "Supplier"}`;
  const hasOpenSupplierOffer = t.offers.some((o) => ["submitted", "shared"].includes(o.status));

  return (
    <div className="thread">
      <div className="thread-head">
        <Link href="/messages" className="icon-btn thread-back" aria-label="Back to inbox">
          <Icon name="arrow" size={16} className="flip" />
        </Link>
        <div style={{ minWidth: 0 }}>
          <h2>{t.subject}</h2>
          <span className="muted">With {others}</span>
        </div>
      </div>
      <div className="thread-body">
        <Conversation
          threadId={t.id}
          initial={data.messages}
          canPost={canPost}
          offerStatuses={t.offers.map((o) => `${o.id}:${o.status}`).join(",")}
          closedReason={closed ? "This offer was withdrawn or not shared, so the conversation is closed." : undefined}
        />
        <aside className="thread-side">
          {t.enquiry && (
            <div className="card panel ctx">
              <span className="eyebrow">Quote request</span>
              {t.enquiry.listingSlug ? (
                <Link href={`/marketplace/${t.enquiry.listingSlug}`} className="link" style={{ fontWeight: 700 }}>{t.enquiry.listingTitle}</Link>
              ) : (
                <b>{t.enquiry.listingTitle}</b>
              )}
              <dl className="review">
                {t.enquiry.listingPrice != null && (<><dt>Listed at</dt><dd className="mono">{inr(t.enquiry.listingPrice)}/kg</dd></>)}
                {t.enquiry.quantity && (<><dt>Quantity</dt><dd>{t.enquiry.quantity}</dd></>)}
                {t.enquiry.country && (<><dt>Destination</dt><dd>{t.enquiry.country}</dd></>)}
                {t.enquiry.incoterm && (<><dt>Incoterm</dt><dd>{t.enquiry.incoterm}</dd></>)}
                {as === "admin" && (<><dt>Buyer</dt><dd>{t.enquiry.name}, {t.enquiry.company}<br /><a className="link" href={`mailto:${t.enquiry.email}`}>{t.enquiry.email}</a></dd></>)}
              </dl>
            </div>
          )}
          {t.rfq && (
            <div className="card panel ctx">
              <span className="eyebrow">Buying request</span>
              <b>{t.rfq.commodity}</b>
              <dl className="review">
                <dt>Ref</dt><dd className="mono">{t.rfq.ref}</dd>
                <dt>Quantity</dt><dd>{t.rfq.quantity}</dd>
                <dt>Destination</dt><dd>{t.rfq.destination}</dd>
                {t.rfq.incoterm && (<><dt>Incoterm</dt><dd>{t.rfq.incoterm}</dd></>)}
                {t.rfq.targetPrice && (<><dt>Target</dt><dd>{t.rfq.targetPrice}</dd></>)}
                {as === "admin" && (<><dt>Buyer</dt><dd>{t.rfq.buyerName}, {t.rfq.buyerCompany}<br /><a className="link" href={`mailto:${t.rfq.buyerEmail}`}>{t.rfq.buyerEmail}</a></dd></>)}
              </dl>
              {as === "buyer" && <Link href={`/account/requests/${t.rfq.ref}`} className="btn btn-sm">Compare all offers</Link>}
            </div>
          )}
          {views.map((o) => (
            <OfferCard key={o.id} o={o} as={as} />
          ))}
          {as === "supplier" && t.enquiry && !hasOpenSupplierOffer && (
            <div className="card panel">
              <h3 style={{ fontSize: "1.05rem" }}>{t.offers.length ? "Send a revised quote" : "Send a quote"}</h3>
              <SupplierOfferForm enquiry={t.enquiry.id} defaults={{ quantity: t.enquiry.quantity ?? undefined, incoterm: t.enquiry.incoterm }} />
            </div>
          )}
          {as === "buyer" && !views.length && t.enquiry && (
            <div className="card panel">
              <p className="muted" style={{ margin: 0 }}>The supplier&apos;s quote will appear here once the trade desk has reviewed it. You can message them in the meantime.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
