"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle,
  Zap, Eye, Layers, ExternalLink,
} from "lucide-react";
import type { OpportunityScore } from "@bloom-ai/types";

interface Props {
  limit?: number;
  compact?: boolean;
  title?: string;
  className?: string;
}

const ACTION_CONFIG = {
  copy: { label: "Copy Trade", icon: Zap, color: "text-emerald-400 bg-emerald-900/20 border-emerald-800/30" },
  rebalance: { label: "Rebalance Index", icon: Layers, color: "text-amber-400 bg-amber-900/20 border-amber-800/30" },
  watch: { label: "Watch Only", icon: Eye, color: "text-bloom-text-muted bg-white/5 border-bloom-border" },
} as const;

function scoreColor(score: number, max: number) {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.65) return "text-emerald-400";
  if (pct >= 0.4) return "text-amber-400";
  return "text-red-400";
}

export default function OpportunityFeedPanel({ limit = 10, compact = false, title, className = "" }: Props) {
  const [items, setItems] = useState<OpportunityScore[]>([]);
  const [meta, setMeta] = useState<{ cachedAt?: string; isStale?: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOpportunities = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/market/opportunities?limit=${limit}${refresh ? "&refresh=true" : ""}`);
      if (!res.ok) throw new Error("unavailable");
      const json = await res.json();
      setItems(Array.isArray(json?.data) ? json.data : []);
      setMeta(json?.meta ?? {});
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit]);

  useEffect(() => { fetchOpportunities(); }, [fetchOpportunities]);

  if (loading) {
    return (
      <div className={`glass-card p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="w-5 h-5 border-2 border-bloom-orange border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-bloom-text-muted">Scanning opportunities…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`glass-card p-6 text-center ${className}`}>
        <AlertCircle size={20} className="text-amber-400 mx-auto mb-2" />
        <p className="text-sm text-bloom-text-muted mb-3">Discovery engine unavailable — API may be cold-starting</p>
        <button onClick={() => fetchOpportunities(true)} className="orange-btn-outline text-xs px-4 py-1.5">Retry</button>
      </div>
    );
  }

  return (
    <div className={`glass-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-bloom-orange uppercase tracking-wider mb-0.5">
            {title ?? "Opportunity Discovery"}
          </p>
          <p className="text-[10px] text-bloom-text-muted">
            Deterministic scores · SoSoValue + SoDEX
            {meta.isStale && <span className="ml-2 text-amber-400">· CACHED</span>}
          </p>
        </div>
        <button
          onClick={() => fetchOpportunities(true)}
          disabled={refreshing}
          className="p-1.5 rounded-lg hover:bg-white/5 text-bloom-text-muted"
          aria-label="Refresh opportunities"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-bloom-text-muted text-center py-6">No opportunities scored yet</p>
      ) : (
        <div className={`space-y-${compact ? "2" : "3"}`}>
          {items.map((opp, i) => {
            const actionCfg = ACTION_CONFIG[opp.action];
            const ActionIcon = actionCfg.icon;
            const DirIcon = opp.direction === "long" ? TrendingUp : opp.direction === "short" ? TrendingDown : Minus;
            return (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl border border-bloom-border hover:border-bloom-border-hover transition-all ${compact ? "p-3" : "p-4"}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-bloom-text-muted w-5">#{opp.rank}</span>
                    <span className="font-bold text-bloom-text">{opp.symbol}</span>
                    <DirIcon size={12} className={opp.direction === "long" ? "text-emerald-400" : opp.direction === "short" ? "text-red-400" : "text-amber-400"} />
                  </div>
                  <span className={`text-sm font-bold ${scoreColor(opp.totalScore, opp.maxScore)}`}>
                    {opp.totalScore}/{opp.maxScore}
                  </span>
                </div>

                {!compact && (
                  <p className="text-xs text-bloom-text-muted leading-relaxed mb-2 line-clamp-2">{opp.thesis}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${actionCfg.color}`}>
                    <ActionIcon size={9} />
                    {actionCfg.label}
                  </span>
                  {!opp.tradable && (
                    <span className="text-[10px] text-amber-400 border border-amber-800/30 bg-amber-900/20 px-2 py-0.5 rounded-full">
                      Not tradable on SoDEX
                    </span>
                  )}
                  {opp.missingInputs.length > 0 && (
                    <span className="text-[10px] text-bloom-text-muted">
                      {opp.missingInputs.length} missing input{opp.missingInputs.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-bloom-border/50">
                  {opp.signalId && (
                    <Link href={`/ledger?signal=${opp.signalId}`} className="text-[10px] text-bloom-orange hover:underline flex items-center gap-1">
                      Ledger <ExternalLink size={9} />
                    </Link>
                  )}
                  {opp.action === "copy" && opp.strategyId && (
                    <Link href={`/copy-trade?strategy=${opp.strategyId}&signal=${opp.signalId ?? ""}`} className="text-[10px] text-emerald-400 hover:underline">
                      Copy →
                    </Link>
                  )}
                  {opp.action === "rebalance" && opp.strategyId && (
                    <Link href={`/strategies/${opp.strategyId}`} className="text-[10px] text-amber-400 hover:underline">
                      Rebalance →
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
