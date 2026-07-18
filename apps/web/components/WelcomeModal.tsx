"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Brain, Shield, Layers, CheckCircle, ChevronRight } from "lucide-react";

const STORAGE_KEY = "bloom-welcome-dismissed";

const WAVES = [
  {
    label: "Phase 1–2 — Complete ✓",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    items: [
      "Five-agent pipeline: Journalist → Chart Analyst → Strategist → Sentinel → Broker",
      "SoSoValue ETF/news + SoDEX tickers, klines, orderbook",
      "Pipeline-generated SSI indices (no static seed catalog)",
      "EIP-712 copy-trade on SoDEX testnet with Sentinel risk gate",
      "Auto-Copy grants — one signature, fills after the next pipeline",
      "Verified fills analytics: equity, by-asset / by-strategy PnL",
    ],
  },
  {
    label: "Phase 3 — Intelligence",
    color: "text-bloom-orange",
    dot: "bg-bloom-orange",
    items: [
      "Deeper SoSoValue Index / Macro / Treasuries feeds",
      "Alerts for ETF spikes, RSI extremes, opportunity scores",
      "Index Publisher Studio with rebalance history",
      "Richer Auto-Copy vs manual attribution",
    ],
  },
  {
    label: "Phase 4 — Mainnet & Ecosystem",
    color: "text-bloom-text-muted",
    dot: "bg-bloom-text-muted",
    items: [
      "SoDEX / ValueChain mainnet (chain ID 286623)",
      "Social copy profiles and subscriber leaderboard",
      "Perps copy-trade with leverage caps",
      "DAO governance for Sentinel rule changes",
    ],
  },
];

const FEATURES = [
  { icon: Brain,  title: "AI Newsletter",   desc: "SoSoValue ETF flows + sentiment → Smart Money Terminal" },
  { icon: Layers, title: "SSI Strategies",  desc: "Pipeline-minted baskets with live SoDEX prices" },
  { icon: Zap,    title: "Trade & Auto-Copy", desc: "Manual MetaMask fills or one Auto-Copy grant" },
  { icon: Shield, title: "Risk Sentinel",   desc: "Gates size, slippage, and daily exposure before Broker" },
];

export default function WelcomeModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if permanently dismissed
    if (localStorage.getItem(STORAGE_KEY) === "permanent") return;
    // Don't show if snoozed this session
    if (sessionStorage.getItem(STORAGE_KEY) === "snoozed") return;
    // Small delay so page loads first
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  const dismiss = (permanent: boolean) => {
    if (permanent) localStorage.setItem(STORAGE_KEY, "permanent");
    else sessionStorage.setItem(STORAGE_KEY, "snoozed");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          onClick={() => dismiss(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-bloom-border-hover bg-bloom-card shadow-orange-glow-lg"
            style={{ background: "rgba(15,12,8,0.97)" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-bloom-border sticky top-0 z-10" style={{ background: "rgba(15,12,8,0.97)" }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-bloom-orange animate-pulse" />
                  <span className="text-xs text-bloom-orange font-medium uppercase tracking-wider">What&apos;s New</span>
                </div>
                <h2 className="text-xl font-bold text-bloom-text">Welcome to Bloom AI</h2>
                <p className="text-sm text-bloom-text-muted mt-0.5">Wave 1 is live — here&apos;s what you can do today</p>
              </div>
              <button
                onClick={() => dismiss(false)}
                className="text-bloom-text-muted hover:text-bloom-text transition-colors p-1 rounded-lg hover:bg-bloom-orange-dim"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Features grid */}
              <div className="grid grid-cols-2 gap-3">
                {FEATURES.map((f) => (
                  <div key={f.title} className="glass-card p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center shrink-0">
                      <f.icon size={14} className="text-bloom-orange" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-bloom-text">{f.title}</p>
                      <p className="text-xs text-bloom-text-muted mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Wave updates */}
              <div className="space-y-4">
                {WAVES.map((wave) => (
                  <div key={wave.label}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${wave.dot}`} />
                      <span className={`text-xs font-semibold uppercase tracking-wider ${wave.color}`}>{wave.label}</span>
                    </div>
                    <ul className="space-y-1.5 pl-4">
                      {wave.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-bloom-text-muted">
                          <ChevronRight size={12} className="mt-0.5 shrink-0 text-bloom-border-hover" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-bloom-border sticky bottom-0" style={{ background: "rgba(15,12,8,0.97)" }}>
              <button
                onClick={() => dismiss(true)}
                className="flex items-center gap-1.5 text-xs text-bloom-text-muted hover:text-bloom-text transition-colors"
              >
                <CheckCircle size={13} />
                Don&apos;t show me again
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => dismiss(false)}
                  className="text-sm text-bloom-text-muted hover:text-bloom-text transition-colors px-4 py-2"
                >
                  Remind me later
                </button>
                <button
                  onClick={() => dismiss(true)}
                  className="orange-btn text-sm px-5 py-2"
                >
                  Got it, let&apos;s go →
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
