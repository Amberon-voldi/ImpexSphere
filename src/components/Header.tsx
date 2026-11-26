"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { nav } from "@/lib/content";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo" aria-label="ImpexSphere home" onClick={() => setOpen(false)}>
          <Image src="/logo.png" alt="ImpexSphere" width={2746} height={456} priority />
        </Link>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav id="site-nav" className={`nav${open ? " open" : ""}`}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/contact" className="btn btn-primary" onClick={() => setOpen(false)}>
            Request a quote
          </Link>
        </nav>
      </div>
    </header>
  );
}
