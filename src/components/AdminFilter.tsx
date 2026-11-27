import Link from "next/link";

/** Row of filter chips that set a query parameter. */
export default function AdminFilter({ base, param, current, options }: { base: string; param: string; current?: string; options: [string, string, number?][] }) {
  return (
    <div className="tags" style={{ marginBottom: 16 }}>
      {options.map(([v, label, n]) => {
        const on = (current ?? "") === v;
        return (
          <Link key={v} href={v ? `${base}?${param}=${v}` : base} className={`chip${on ? " chip-on" : ""}`} aria-current={on ? "page" : undefined}>
            {label}
            {n !== undefined && <span className="mono" style={{ opacity: 0.7 }}>{n}</span>}
          </Link>
        );
      })}
    </div>
  );
}
