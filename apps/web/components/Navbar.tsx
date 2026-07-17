"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import WalletButton from "@/components/WalletButton";
import BloomBackground from "@/components/BloomBackground";

/** Primary journey — keep to 5 so the pill stays readable */
const PRIMARY_LINKS = [
  { label: "Home", href: "/dashboard" },
  { label: "Discover", href: "/research" },
  { label: "News", href: "/terminal" },
  { label: "Strategies", href: "/strategies" },
  { label: "Trade", href: "/copy-trade" },
];

const MORE_LINKS = [
  { label: "Performance", href: "/performance", hint: "Your fills & PnL" },
  { label: "Ledger", href: "/ledger", hint: "Signal proof trail" },
  { label: "Social", href: "/leaderboard", hint: "Copy leaderboard" },
  { label: "Docs", href: "/docs", hint: "How Bloom works" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const moreActive = MORE_LINKS.some((l) => isActive(pathname, l.href));

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      <BloomBackground />
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-1.5 shrink-0">
          <Image
            src="/bloom.png"
            alt="Bloom AI"
            width={160}
            height={160}
            className="w-14 h-14 md:w-16 md:h-16 object-contain animate-nav-flower"
            priority
          />
          <span className="font-bold text-lg md:text-xl tracking-tight">
            <span className="text-bloom-text">Bloom</span>
            <span className="text-bloom-orange"> AI</span>
          </span>
        </Link>

        {/* Desktop primary pill — frosted glass (explicit rgba; Tailwind /opacity breaks theme rgba colors) */}
        <div
          className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-0.5 rounded-full px-1.5 py-1 border border-white/10 backdrop-blur-xl"
          style={{
            background: "rgba(14, 8, 4, 0.55)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {PRIMARY_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-bloom-orange-dim text-bloom-orange border border-bloom-border-hover"
                    : "text-bloom-text-muted hover:text-bloom-text hover:bg-white/5",
                )}
              >
                {active ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-bloom-orange" />
                    {link.label}
                  </span>
                ) : (
                  link.label
                )}
              </Link>
            );
          })}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={clsx(
                "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1",
                moreActive || moreOpen
                  ? "bg-bloom-orange-dim text-bloom-orange border border-bloom-border-hover"
                  : "text-bloom-text-muted hover:text-bloom-text hover:bg-white/5",
              )}
            >
              More
              <ChevronDown size={14} className={clsx("transition-transform", moreOpen && "rotate-180")} />
            </button>
            {moreOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 glass-card p-1.5 shadow-xl">
                {MORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={clsx(
                      "block rounded-xl px-3 py-2.5 transition-colors",
                      isActive(pathname, link.href)
                        ? "bg-bloom-orange-dim text-bloom-orange"
                        : "text-bloom-text-muted hover:bg-white/5 hover:text-bloom-text",
                    )}
                  >
                    <p className="text-sm font-medium">{link.label}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{link.hint}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="hidden lg:block">
          <WalletButton />
        </div>

        <button
          className="lg:hidden text-bloom-text-muted hover:text-bloom-text p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-bloom-bg/95 backdrop-blur-xl flex flex-col pt-20 px-5 pb-8 gap-1 overflow-y-auto lg:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-bloom-text-muted px-3 mb-1">
            Main
          </p>
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "px-4 py-3 rounded-2xl text-base font-medium border transition-all",
                isActive(pathname, link.href)
                  ? "border-bloom-border-hover bg-bloom-orange-dim text-bloom-orange"
                  : "border-bloom-border text-bloom-text-muted",
              )}
            >
              {link.label}
            </Link>
          ))}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-bloom-text-muted px-3 mt-4 mb-1">
            More
          </p>
          {MORE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "px-4 py-3 rounded-2xl text-base font-medium border transition-all",
                isActive(pathname, link.href)
                  ? "border-bloom-border-hover bg-bloom-orange-dim text-bloom-orange"
                  : "border-bloom-border text-bloom-text-muted",
              )}
            >
              {link.label}
              <span className="block text-[11px] opacity-60 font-normal mt-0.5">{link.hint}</span>
            </Link>
          ))}
          <div className="mt-4 px-1">
            <WalletButton />
          </div>
        </div>
      )}
    </>
  );
}
