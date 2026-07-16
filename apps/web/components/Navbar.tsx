"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { clsx } from "clsx";
import WalletButton from "@/components/WalletButton";
import BloomBackground from "@/components/BloomBackground";

const NAV_LINKS = [
  { label: "Research",     href: "/research"     },
  { label: "Terminal",     href: "/terminal"     },
  { label: "Strategies",  href: "/strategies"   },
  { label: "Copy Trade",  href: "/copy-trade"   },
  { label: "Ledger",      href: "/ledger"       },
  { label: "Social",      href: "/leaderboard"  },
  { label: "Performance", href: "/performance"  },
  { label: "Dashboard",   href: "/dashboard"    },
  { label: "Docs",        href: "/docs"         },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <BloomBackground />
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <Image
            src="/bloom.png"
            alt="Bloom AI logo"
            width={160}
            height={160}
            className="w-20 h-20 object-contain animate-nav-flower"
            priority
          />
          <span className="font-bold text-xl tracking-tight">
            <span className="text-bloom-text">Bloom</span><span className="text-bloom-orange"> AI</span>
          </span>
        </Link>

        {/* Desktop nav — pill absolutely centered */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 bg-bloom-bg-card backdrop-blur-md border border-bloom-border rounded-full px-2 py-1.5">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-bloom-orange-dim text-bloom-orange border border-bloom-border-hover"
                    : "text-bloom-text-muted hover:text-bloom-text hover:bg-white/5"
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
        </div>

        {/* Wallet button — right, outside the pill */}
        <div className="hidden md:block">
          <WalletButton />
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-bloom-text-muted hover:text-bloom-text"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-bloom-bg/95 backdrop-blur-xl flex flex-col pt-20 px-6 gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "px-5 py-3.5 rounded-2xl text-base font-medium border transition-all",
                pathname === link.href
                  ? "border-bloom-border-hover bg-bloom-orange-dim text-bloom-orange"
                  : "border-bloom-border text-bloom-text-muted hover:text-bloom-text hover:border-bloom-border-hover"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-4">
            <WalletButton />
          </div>
        </div>
      )}
    </>
  );
}
