"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CardListing } from "@/lib/types";
import CommandPalette from "./CommandPalette";
import ShortlistDrawer from "./ShortlistDrawer";
import Icon from "./Icon";

export type ShortItem = Omit<CardListing, "spark" | "views" | "updatedAt">;

type Ctx = {
  items: ShortItem[];
  has: (slug: string) => boolean;
  toggle: (l: ShortItem) => boolean;
  remove: (slug: string) => void;
  clear: () => void;
  drawer: boolean;
  setDrawer: (v: boolean) => void;
  palette: boolean;
  setPalette: (v: boolean) => void;
  toast: (msg: string) => void;
};

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside Providers");
  return c;
};

const KEY = "impexsphere.shortlist.v1";

export default function Providers({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ShortItem[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: ShortItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      items,
      has: (slug) => items.some((i) => i.slug === slug),
      toggle: (l) => {
        const exists = items.some((i) => i.slug === l.slug);
        if (exists) {
          persist(items.filter((i) => i.slug !== l.slug));
          toast("Removed from shortlist");
        } else {
          persist([...items, l].slice(-12));
          toast("Added to shortlist");
        }
        return !exists;
      },
      remove: (slug) => persist(items.filter((i) => i.slug !== slug)),
      clear: () => persist([]),
      drawer,
      setDrawer,
      palette,
      setPalette,
      toast,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, drawer, palette, toast],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === "/" && !/input|textarea|select/i.test((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <AppCtx.Provider value={value}>
        {children}
        <CommandPalette />
        <ShortlistDrawer />
        <div className="toasts" aria-live="polite">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                className="toast"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
              >
                <Icon name="check" size={16} stroke={2.4} /> {t.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </AppCtx.Provider>
    </MotionConfig>
  );
}
