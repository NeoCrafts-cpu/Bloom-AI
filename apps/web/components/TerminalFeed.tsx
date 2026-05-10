"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { SmartMoneyNewsletter } from "@bloom-ai/types";

// Mock data for development when API is not running
const MOCK_NEWSLETTERS: SmartMoneyNewsletter[] = [
  {
    id: "nl-001",
    title: "Institutional Rotation into Real World Assets — Smart Money Signals",
    summary:
      "ETF inflow data reveals a decisive $2.4B weekly net positive flow into BTC spot ETFs, while on-chain analytics show synchronized whale accumulation. The Journalist agent detects a classic pre-rally setup.",
    body: "",
    narrative: "risk-on",
    keyAssets: ["BTC", "ETH", "ONDO", "MKR"],
    etfFlows: [
      { date: "2026-05-09", ticker: "IBIT", netInflow: 412000000, totalAUM: 48000000000, change24h: 2.1 },
      { date: "2026-05-09", ticker: "FBTC", netInflow: 287000000, totalAUM: 22000000000, change24h: 1.8 },
    ],
    sentiment: [],
    publishedAt: new Date(Date.now() - 1800000).toISOString(),
    strategyId: "ssi-rwa-001",
  },
  {
    id: "nl-002",
    title: "DeFi Protocol Revenue Hits ATH — DEFI.ssi Rebalance Incoming",
    summary:
      "On-chain data from DefiLlama shows aggregate DeFi protocol revenue crossing $980M monthly — an all-time high. The Strategist agent has triggered a rebalance of the BLOOM-DEFI index to increase weight in AAVE and GMX.",
    body: "",
    narrative: "risk-on",
    keyAssets: ["AAVE", "GMX", "UNI", "COMP"],
    etfFlows: [],
    sentiment: [],
    publishedAt: new Date(Date.now() - 5400000).toISOString(),
    strategyId: "ssi-defi-002",
  },
  {
    id: "nl-003",
    title: "Macro Risk-Off Signal: Fed Minutes Trigger Sentiment Shift",
    summary:
      "The SoSoValue sentiment API flags a shift to bearish across 74% of monitored news sources following FOMC minutes. The Sentinel module has raised the max daily exposure limit reduction for all active copy-trade strategies.",
    body: "",
    narrative: "risk-off",
    keyAssets: ["USDC", "BTC"],
    etfFlows: [
      { date: "2026-05-08", ticker: "IBIT", netInflow: -180000000, totalAUM: 47500000000, change24h: -1.4 },
    ],
    sentiment: [],
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
  },
];

const NARRATIVE_COLORS = {
  "risk-on": "text-emerald-400 bg-emerald-900/20 border-emerald-800/30",
  "risk-off": "text-red-400 bg-red-900/20 border-red-800/30",
  neutral: "text-bloom-text-muted bg-white/5 border-bloom-border",
  rotation: "text-amber-400 bg-amber-900/20 border-amber-800/30",
};

const NARRATIVE_LABELS = {
  "risk-on": "Risk On",
  "risk-off": "Risk Off",
  neutral: "Neutral",
  rotation: "Rotation",
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function TerminalFeed() {
  const [newsletters, setNewsletters] = useState<SmartMoneyNewsletter[]>(MOCK_NEWSLETTERS);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SmartMoneyNewsletter | null>(null);

  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        const res = await fetch("/api/newsletters?limit=20");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          if (list.length > 0) setNewsletters(list);
        }
      } catch {
        // Use mock data when API is not running
      }
    };

    fetchNewsletters();

    // SSE for real-time newsletter updates
    const apiUrl =
      typeof window !== "undefined" && window.location.hostname !== "localhost"
        ? "https://bloom-ai-mqrb.onrender.com"
        : "http://localhost:4000";
    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource(`${apiUrl}/api/newsletters/stream`);
      evtSource.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Handle initial bulk load from SSE
          if (msg.type === "INITIAL" && Array.isArray(msg.data)) {
            setNewsletters(msg.data);
          } else if (msg.type === "JOURNALIST_PUBLISHED" && msg.payload) {
            setNewsletters((prev) => [msg.payload, ...prev.slice(0, 19)]);
          }
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // SSE not available
    }

    return () => {
      evtSource?.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-6 h-36 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Feed list */}
      <div className="lg:col-span-2 space-y-4">
        <AnimatePresence initial={false}>
          {newsletters.map((nl, i) => (
            <motion.div
              key={nl.id}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.35, delay: i < 3 ? i * 0.08 : 0, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <NewsletterCard
                newsletter={nl}
                active={selected?.id === nl.id}
                onClick={() => setSelected(nl)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Detail panel */}
      <div className="lg:col-span-1">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <NewsletterDetail newsletter={selected} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-8 text-center text-bloom-text-muted text-sm flex flex-col items-center gap-3 h-64 justify-center"
            >
              <TrendingUp size={32} className="text-bloom-border" />
              <p>Select a newsletter to view details and copy the strategy</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NewsletterCard({
  newsletter,
  active,
  onClick,
}: {
  newsletter: SmartMoneyNewsletter;
  active: boolean;
  onClick: () => void;
}) {
  const nc = NARRATIVE_COLORS[newsletter.narrative];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left glass-card p-5 transition-all duration-200 hover:border-bloom-border-hover hover:shadow-orange-glow ${
        active ? "border-bloom-border-hover shadow-orange-glow" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${nc}`}
        >
          {newsletter.narrative === "risk-on" ? (
            <TrendingUp size={10} />
          ) : (
            <TrendingDown size={10} />
          )}
          {NARRATIVE_LABELS[newsletter.narrative]}
        </span>
        <span className="flex items-center gap-1 text-xs text-bloom-text-muted shrink-0">
          <Clock size={10} />
          {timeAgo(newsletter.publishedAt)}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-bloom-text mb-2 line-clamp-2">
        {newsletter.title}
      </h3>

      <p className="text-xs text-bloom-text-muted leading-relaxed line-clamp-2">
        {newsletter.summary}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {newsletter.keyAssets.slice(0, 4).map((asset) => (
          <span key={asset} className="pill-badge text-xs">
            {asset}
          </span>
        ))}
      </div>
    </button>
  );
}

function NewsletterDetail({ newsletter }: { newsletter: SmartMoneyNewsletter }) {
  const nc = NARRATIVE_COLORS[newsletter.narrative];

  return (
    <div className="glass-card p-6 sticky top-24">
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${nc}`}>
          {NARRATIVE_LABELS[newsletter.narrative]}
        </span>
        <span className="text-xs text-bloom-text-muted">
          {timeAgo(newsletter.publishedAt)}
        </span>
      </div>

      <h3 className="text-base font-bold text-bloom-text mb-3">
        {newsletter.title}
      </h3>

      <p className="text-sm text-bloom-text-muted leading-relaxed mb-5">
        {newsletter.summary}
      </p>

      {/* ETF Flows */}
      {newsletter.etfFlows.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
            ETF Flow Signals
          </p>
          <div className="space-y-2">
            {newsletter.etfFlows.map((flow) => (
              <div
                key={flow.ticker}
                className="flex items-center justify-between text-xs bg-bloom-bg rounded-xl px-3 py-2 border border-bloom-border"
              >
                <span className="font-mono font-semibold text-bloom-text">
                  {flow.ticker}
                </span>
                <span
                  className={
                    flow.netInflow >= 0 ? "text-emerald-400" : "text-red-400"
                  }
                >
                  {flow.netInflow >= 0 ? "+" : ""}
                  ${(Math.abs(flow.netInflow) / 1e6).toFixed(0)}M
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key assets */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
          Key Assets
        </p>
        <div className="flex flex-wrap gap-1.5">
          {newsletter.keyAssets.map((asset) => (
            <span key={asset} className="pill-badge-orange text-xs">
              {asset}
            </span>
          ))}
        </div>
      </div>

      {/* Copy Strategy CTA */}
      {newsletter.strategyId ? (
        <Link
          href={`/copy-trade?strategy=${newsletter.strategyId}`}
          className="orange-btn flex items-center justify-center gap-2 w-full text-sm"
        >
          Copy Strategy On-Chain
          <ExternalLink size={14} />
        </Link>
      ) : (
        <p className="text-xs text-bloom-text-muted text-center py-3">
          Strategy index pending Strategist agent...
        </p>
      )}
    </div>
  );
}
