"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Layers, ArrowUpRight, Play, AlertCircle, Eye } from "lucide-react";
import type { SSIIndex } from "@bloom-ai/types";

export default function StrategiesGrid() {
  const [strategies, setStrategies] = useState<SSIIndex[]>([]);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStrategies = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/strategies");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.data) ? data.data : [];
          setStrategies(list);
          setEmptyMessage(
            data?.meta?.message ??
              (list.length === 0 ? "Run the agent pipeline to generate strategies" : null),
          );
        } else {
          setStrategies([]);
          setEmptyMessage("Strategy API unavailable");
        }
      } catch {
        setStrategies([]);
        setEmptyMessage("Strategy API offline");
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

  if (strategies.length === 0) {
    return (
      <div className="glass-card p-10 flex flex-col items-center gap-4 text-center">
        <AlertCircle size={28} className="text-bloom-text-muted" />
        <div>
          <h3 className="text-base font-bold text-bloom-text mb-1">No strategies yet</h3>
          <p className="text-sm text-bloom-text-muted max-w-md">
            {emptyMessage ??
              "Run the agent pipeline below (or on Home) to mint an SSI basket from live SoSoValue + SoDEX data."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/dashboard" className="orange-btn flex items-center gap-2 text-sm px-5 py-2.5">
            <Play size={14} />
            Run pipeline on Home
          </Link>
          <Link href="/research" className="orange-btn-outline flex items-center gap-2 text-sm px-5 py-2.5">
            Browse Discover
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {strategies.map((strategy, i) => (
        <motion.div
          key={strategy.id}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
          whileHover={{ y: -4 }}
          className="glass-card p-6 flex flex-col gap-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center shrink-0">
                  <Layers size={12} className="text-bloom-orange" />
                </div>
                <code className="text-xs font-mono text-bloom-orange truncate">{strategy.symbol}</code>
              </div>
              <h3 className="text-base font-bold text-bloom-text">{strategy.name}</h3>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-900/20 border-emerald-800/30 shrink-0">
              Live
            </span>
          </div>

          <p className="text-xs text-bloom-text-muted leading-relaxed line-clamp-3">
            {strategy.description}
          </p>

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
                    {asset.currentPrice > 0 && (
                      <span className="text-bloom-text/70">
                        {" "}
                        · ${asset.currentPrice.toLocaleString()}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-bloom-border text-xs text-bloom-text-muted">
            <span>
              Assets:{" "}
              <span className="text-bloom-text font-semibold">
                {Array.isArray(strategy.assets) ? strategy.assets.length : 0}
              </span>
            </span>
            <span>
              Updated:{" "}
              <span className="text-bloom-text font-semibold">
                {new Date(strategy.rebalancedAt).toLocaleDateString()}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/strategies/${strategy.id}`}
              className="orange-btn-outline flex items-center justify-center gap-1.5 text-sm py-2.5"
            >
              <Eye size={14} />
              Review
            </Link>
            <Link
              href={`/copy-trade?strategy=${strategy.id}`}
              className="orange-btn flex items-center justify-center gap-1.5 text-sm py-2.5"
            >
              Trade
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
