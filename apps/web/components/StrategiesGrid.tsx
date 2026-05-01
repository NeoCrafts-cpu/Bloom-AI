"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Layers, ArrowUpRight } from "lucide-react";
import type { SSIIndex } from "@bloom-ai/types";

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
  const [strategies, setStrategies] = useState<SSIIndex[]>(MOCK_STRATEGIES);

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/strategies`
        );
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : null;
          if (list) setStrategies(list);
        }
      } catch {
        // Use mock
      }
    };
    fetchStrategies();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {strategies.map((strategy, i) => {
        const perf = PERF_MOCK[strategy.id] ?? 0;
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
              <div
                className={`flex items-center gap-1 text-sm font-bold ${
                  perf >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {perf >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {perf >= 0 ? "+" : ""}
                {perf.toFixed(1)}%
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-bloom-text-muted leading-relaxed">
              {strategy.description}
            </p>

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
  );
}
