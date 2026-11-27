import Link from "next/link";
import { ago } from "@/lib/format";
import type { PublicRfq } from "@/lib/types";
import Icon from "./Icon";

export default function RfqItem({ r }: { r: PublicRfq }) {
  return (
    <article className="card rfq-item spot">
      <div>
        <div className="top">
          <span className="chip chip-dot" style={{ ["--c" as string]: r.category?.hue ?? "var(--gold)" }}>
            {r.category?.name ?? "Other"}
          </span>
          <span className="mono">{r.ref}</span>
          <span>·</span>
          <span>{ago(r.createdAt)}</span>
          {r.isSample && <span className="badge badge-sample">Sample</span>}
        </div>
        <h3>{r.commodity}</h3>
        <div className="facts">
          <span><b>Qty</b>{r.quantity}</span>
          <span><b>To</b>{r.destination}</span>
          {r.incoterm && <span><b>Terms</b>{r.incoterm}</span>}
          {r.targetPrice && <span><b>Target</b>{r.targetPrice}</span>}
          {r.deliveryBy && <span><b>Delivery</b>{r.deliveryBy}</span>}
        </div>
        {r.specs && <p className="muted" style={{ margin: "8px 0 0", fontSize: "0.88rem" }}>{r.specs}</p>}
      </div>
      <Link href={`/rfq/${r.ref}#offer`} className="btn btn-sm">
        Send offer <Icon name="arrow" size={14} className="arrow" />
      </Link>
    </article>
  );
}
