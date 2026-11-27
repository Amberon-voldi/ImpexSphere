"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

export type NavItem = { href: string; label: string; icon: string; badge?: number };

/** Sidebar + content layout shared by the supplier dashboard and admin console. */
export default function DashShell({ title, subtitle, nav, children, id }: { title: string; subtitle?: React.ReactNode; nav: NavItem[]; children: React.ReactNode; id: string }) {
  const path = usePathname();
  const active = [...nav].sort((a, b) => b.href.length - a.href.length).find((n) => path === n.href || path.startsWith(n.href + "/"))?.href;
  return (
    <section className="dash">
      <div className="container dash-layout">
        <aside className="dash-side">
          <div className="dash-title">
            <b>{title}</b>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <nav className="dash-nav" aria-label={title}>
            {nav.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active === n.href ? "page" : undefined}>
                {active === n.href && <motion.span layoutId={`dash-pill-${id}`} className="dash-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Icon name={n.icon} size={17} />
                <span>{n.label}</span>
                {!!n.badge && <em>{n.badge}</em>}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="dash-main">{children}</div>
      </div>
    </section>
  );
}
