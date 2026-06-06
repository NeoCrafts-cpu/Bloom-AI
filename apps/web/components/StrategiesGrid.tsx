"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Layers, ArrowUpRight } from "lucide-react";
import type { SSIIndex } from "@bloom-ai/types";

// Deterministic sparkline data per strategy (seeded, not random)
const SPARKLINE_DATA: Record<string, number[]> = {
  "ssi-rwa-001":  [100, 101.2, 100.8, 102.4, 103.1, 102.6, 104.2, 105.8, 105.3, 106.9, 107.5, 107.1, 109.2, 110.4, 114.2],
  "ssi-defi-002": [100, 102.4, 101.8, 105.2, 108.3, 106.9, 112.1, 118.5, 115.9, 121.4, 124.7, 122.3, 128.8, 130.5, 131.7],
  "ssi-mag7-003": [100, 101.8, 101.2, 103.7, 105.2, 104.5, 107.3, 110.1, 109.4, 112.8, 114.6, 113.9, 118.2, 120.7, 122.5],
};

const PERF_30D: Record<string, { pct: number; label: string }> = {
  "ssi-rwa-001":  { pct: 14.2, label: "30d" },
  "ssi-defi-002": { pct: 31.7, label: "30d" },
  "ssi-mag7-003": { pct: 22.5, label: "30d" },
};

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#34d399" : "#f87171"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const MOCK_STRATEGIES: SSIIndex[] = [
  {
    id: "ssi-rwa-001",
    name: "BLOOM-RWA",
    symbol: "BLOOM-RWA.ssi",
    description: "AI-curated Real World Asset index. Overweights tokenised T-bills, real estate tokens, and institutional-grade stablecoins based on macro rotation signals.",
    assets: [
      { symbol: "ONDO", address: "0x...", weight: 0.35, currentPrice: 1.42 },
      { symbol: "MKR", address: "0x...", weight: 0.25, currentPrice: 2841 },
      { symbol: "USDC", address: "0x...", weight: 0.20, currentPrice: 1.00 },
      { symbol: "LINK", address: "0x...", weight: 0.20, currentPrice: 17.83 },
    ],
    tvl: 8400000,
    dailyFee: 0.0001,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    rebalancedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "ssi-defi-002",
    name: "BLOOM-DEFI",
    symbol: "BLOOM-DEFI.ssi",
    description: "High-beta DeFi protocol basket. Tracks top revenue-generating protocols with dynamic weighting based on 30-day protocol fee growth.",
    assets: [
      { symbol: "AAVE", address: "0x...", weight: 0.30, currentPrice: 312 },
      { symbol: "GMX", address: "0x...", weight: 0.25, currentPrice: 47.2 },
      { symbol: "UNI", address: "0x...", weight: 0.25, currentPrice: 12.4 },
      { symbol: "COMP", address: "0x...", weight: 0.20, currentPrice: 89.1 },
    ],
    tvl: 5200000,
    dailyFee: 0.0001,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    rebalancedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "ssi-mag7-003",
    name: "BLOOM-MAG7",
    symbol: "BLOOM-MAG7.ssi",
    description: "Crypto's magnificent seven — top 7 assets by institutional adoption, ETF inflows, and on-chain activity. Auto-rebalances when ETF flow dominance shifts.",
    assets: [
      { symbol: "BTC", address: "0x...", weight: 0.35, currentPrice: 68420 },
      { symbol: "ETH", address: "0x...", weight: 0.25, currentPrice: 3812 },
      { symbol: "SOL", address: "0x...", weight: 0.15, currentPrice: 182.4 },
      { symbol: "BNB", address: "0x...", weight: 0.10, currentPrice: 591.2 },
      { symbol: "AVAX", address: "0x...", weight: 0.08, currentPrice: 38.91 },
      { symbol: "LINK", address: "0x...", weight: 0.04, currentPrice: 17.83 },
      { symbol: "ARB", address: "0x...", weight: 0.03, currentPrice: 0.912 },
    ],
    tvl: 14700000,
    dailyFee: 0.0001,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    rebalancedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const PERF_MOCK: Record<string, number> = {
  "ssi-rwa-001": 14.2,
  "ssi-defi-002": 31.7,
  "ssi-mag7-003": 22.5,
};

export default function StrategiesGrid() {
  const [strategies, setStrategies] = useState<SSIIndex[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStrategies = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/strategies");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : null;
          if (list && list.length > 0) {
            setStrategies(list);
            setIsDemo(false);
          } else {
            setStrategies(MOCK_STRATEGIES);
            setIsDemo(true);
          }
        } else {
          setStrategies(MOCK_STRATEGIES);
          setIsDemo(true);
        }
      } catch {
        setStrategies(MOCK_STRATEGIES);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStrategies();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-6 h-64 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {isDemo && (
        <div className="mb-4">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-amber-400 bg-amber-900/20 border-amber-800/30">
            Demo sample · API offline or empty
          </span>
        </div>
      )}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {strategies.map((strategy, i) => {
        const perf     = PERF_MOCK[strategy.id] ?? 0;
          const perf30d   = PERF_30D[strategy.id];
          const sparkData = SPARKLINE_DATA[strategy.id];
        return (
          <motion.div
            key={strategy.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -5, boxShadow: "0 8px 40px rgba(232,97,10,0.18)" }}
            className="glass-card p-6 flex flex-col gap-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
                    <Layers size={12} className="text-bloom-orange" />
                  </div>
                  <code className="text-xs font-mono text-bloom-orange">
                    {strategy.symbol}
                  </code>
                </div>
                <h3 className="text-base font-bold text-bloom-text">
                  {strategy.name}
                </h3>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div
                  className={`flex items-center gap-1 text-sm font-bold ${
                    perf >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {perf >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {perf >= 0 ? "+" : ""}{perf.toFixed(1)}%
                </div>
                <span className="text-[10px] text-bloom-text-muted font-medium">{perf30d?.label ?? "30d"}</span>
              </div>
            </div>

            {/* Sparkline */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-bloom-text-muted leading-relaxed flex-1 mr-3">
                {strategy.description}
              </p>
              {sparkData && (
                <Sparkline data={sparkData} positive={perf >= 0} />
              )}
            </div>

            {/* Asset weights */}
            <div>
              <p className="text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
                Composition
              </p>
              <div className="space-y-1.5">
                {(Array.isArray(strategy.assets) ? strategy.assets : []).slice(0, 4).map((asset) => (
                  <div key={asset.symbol} className="flex items-center gap-2">
                    <div
                      className="h-1 rounded-full bg-bloom-orange"
                      style={{ width: `${asset.weight * 100}%`, maxWidth: "60%" }}
                    />
                    <span className="text-xs font-mono text-bloom-text-muted shrink-0">
                      {asset.symbol} — {(asset.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
                {Array.isArray(strategy.assets) && strategy.assets.length > 4 && (
                  <p className="text-xs text-bloom-text-muted">
                    +{strategy.assets.length - 4} more assets
                  </p>
                )}
              </div>
            </div>

            {/* TVL */}
            <div className="flex items-center justify-between pt-3 border-t border-bloom-border text-xs text-bloom-text-muted">
              <span>
                TVL:{" "}
                <span className="text-bloom-text font-semibold">
                  ${(strategy.tvl / 1e6).toFixed(2)}M
                </span>
              </span>
              <span>
                Fee: <span className="text-bloom-text font-semibold">0.01% / day</span>
              </span>
            </div>

            {/* CTA */}
            <Link
              href={`/copy-trade?strategy=${strategy.id}`}
              className="orange-btn flex items-center justify-center gap-2 text-sm w-full"
            >
              Copy On-Chain
              <ArrowUpRight size={14} />
            </Link>
          </motion.div>
        );
      })}
    </div>
    </div>
  );
}
