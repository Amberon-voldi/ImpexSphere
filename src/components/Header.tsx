"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { nav } from "@/lib/content";
import Icon from "./Icon";
import { useApp } from "./Providers";

export function Logo() {
  return (
    <span className="logo" aria-label="ImpexSphere">
      <b>IMPEX</b>
      <span>
        SP
        <i />
        HERE
      </span>
    </span>
  );
}

export type HeaderUser = { name: string; email: string; role: "buyer" | "supplier" | "admin"; hasSupplier: boolean } | null;

function AccountMenu({ user }: { user: NonNullable<HeaderUser> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const links = [
    ...(user.role === "admin" ? [{ href: "/admin", label: "Admin console" }] : []),
    ...(user.hasSupplier ? [{ href: "/dashboard", label: "Supplier dashboard" }, { href: "/dashboard/listings/new", label: "New listing" }] : []),
    { href: "/account", label: "Account & requests" },
  ];
  return (
    <div className="acct" ref={ref}>
      <button className="avatar-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label="Account menu">
        {initials}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="acct-menu"
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          >
            <div className="acct-who">
              <b>{user.name}</b>
              <span>{user.email}</span>
            </div>
            {links.map((l) => (
              <Link key={l.href} href={l.href} role="menuitem" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <form action={signOut}>
              <button type="submit" role="menuitem">Sign out</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Header({ user }: { user: HeaderUser }) {
  const pathname = usePathname();
  const { items, setDrawer, setPalette } = useApp();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 20));
  useEffect(() => setOpen(false), [pathname]);

  const current = nav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.href;
  const pillOn = hover ?? current;

  return (
    <header className={`header${scrolled || open ? " scrolled" : ""}`}>
      <div className="container">
        <div className="header-bar">
          <Link href="/" aria-label="ImpexSphere home">
            <Logo />
          </Link>
          <nav className="nav" onMouseLeave={() => setHover(null)} aria-label="Main">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current === item.href ? "page" : undefined}
                onMouseEnter={() => setHover(item.href)}
              >
                {pillOn === item.href && (
                  <motion.span layoutId="nav-pill" className="pill" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
                )}
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <button className="kbd-btn" onClick={() => setPalette(true)} aria-label="Search (Ctrl+K)">
              <Icon name="search" size={16} />
              <span className="label">Search marketplace</span>
              <kbd>⌘K</kbd>
            </button>
            <button className="icon-btn" onClick={() => setDrawer(true)} aria-label={`Shortlist, ${items.length} saved`}>
              <Icon name="heart" />
              <AnimatePresence>
                {items.length > 0 && (
                  <motion.span
                    key={items.length}
                    className="count"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 15 }}
                  >
                    {items.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            {user ? (
              <AccountMenu user={user} />
            ) : (
              <>
                <Link href="/login" className="btn btn-sm btn-ghost hide-sm">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-gold btn-sm hide-sm">
                  Join free
                </Link>
              </>
            )}
            <button className="icon-btn menu-toggle" aria-expanded={open} aria-controls="mobile-nav" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
              <Icon name={open ? "close" : "menu"} />
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            className="mobile-nav"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            aria-label="Mobile"
          >
            {[
              ...nav,
              { href: "/rfq#post", label: "Post a buying request" },
              ...(user
                ? [
                    ...(user.role === "admin" ? [{ href: "/admin", label: "Admin console" }] : []),
                    ...(user.hasSupplier ? [{ href: "/dashboard", label: "Supplier dashboard" }] : []),
                    { href: "/account", label: "Your account" },
                  ]
                : [
                    { href: "/login", label: "Sign in" },
                    { href: "/signup", label: "Create an account" },
                  ]),
            ].map((item, i) => (
              <motion.div key={item.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                <Link href={item.href} onClick={() => setOpen(false)} style={{ display: "block" }}>
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
