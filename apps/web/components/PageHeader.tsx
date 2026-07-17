"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Check } from "lucide-react";

const STEPS = [
  { id: "discover", label: "Discover", href: "/research", match: ["/research", "/terminal", "/ledger"] },
  { id: "strategies", label: "Strategies", href: "/strategies", match: ["/strategies"] },
  { id: "trade", label: "Trade", href: "/copy-trade", match: ["/copy-trade"] },
  { id: "results", label: "Results", href: "/performance", match: ["/performance", "/leaderboard"] },
] as const;

function stepIndex(pathname: string): number {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (STEPS[i].match.some((m) => pathname === m || pathname.startsWith(`${m}/`))) {
      return i;
    }
  }
  if (pathname === "/dashboard") return -1;
  return -1;
}

/** Compact journey strip — orients users in the Discover → Trade loop */
export function FlowSteps({ className = "" }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const current = stepIndex(pathname);

  return (
    <nav
      aria-label="Trading journey"
      className={clsx(
        "flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 scrollbar-none",
        className,
      )}
    >
      {STEPS.map((step, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <div key={step.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
            {i > 0 && (
              <span
                className={clsx(
                  "hidden sm:block w-6 h-px",
                  done || active ? "bg-bloom-orange/50" : "bg-bloom-border",
                )}
              />
            )}
            <Link
              href={step.href}
              className={clsx(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-semibold border transition-colors",
                active
                  ? "border-bloom-border-hover bg-bloom-orange-dim text-bloom-orange"
                  : done
                    ? "border-bloom-border text-bloom-text hover:border-bloom-border-hover"
                    : "border-bloom-border text-bloom-text-muted hover:text-bloom-text",
              )}
            >
              <span
                className={clsx(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold",
                  active
                    ? "bg-bloom-orange text-bloom-bg"
                    : done
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-bloom-bg text-bloom-text-muted",
                )}
              >
                {done ? <Check size={10} /> : i + 1}
              </span>
              {step.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  live,
  actions,
  showFlow = true,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  live?: boolean;
  actions?: React.ReactNode;
  showFlow?: boolean;
}) {
  return (
    <header className="mt-2 mb-6 md:mb-8">
      {showFlow && (
        <div className="mb-4">
          <FlowSteps />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          {(eyebrow || live) && (
            <div className={clsx("mb-2 w-fit", live ? "pill-badge-orange" : "pill-badge")}>
              {live && <span className="live-dot" />}
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-bloom-text tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-bloom-text-muted text-sm mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
