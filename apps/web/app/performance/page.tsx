"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Activity, BarChart3, ExternalLink, RefreshCw, Trophy, Zap, Shield,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { VALUECHAIN_TESTNET, SODEX_TESTNET_TRADE_URL, isOnChainTxHash } from "@/lib/valuechain";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface TradeRecord {
  id: string;
  timestamp: string;
  strategyId: string;
  userAddress: string;
  allocationUSD: number;
  sentinelStatus: "passed" | "blocked";
  ordersCount: number;
  totalExecutedUSD: number;
  symbol: string;
  simulated?: boolean;
}

interface PerformanceStats {
  totalTrades: number;
  blockedTrades: number;
  totalExecutedUSD: number;
  verifiedPnlUSD: number;
  winRate: number | null;
  maxDrawdownUSD: number;
  avgTradeUSD: number;
  simulatedTrades: number;
  liveTrades: number;
  mtmTrades?: number;
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function KpiCard({
  label, value, sub, icon: Icon, color = "orange", delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: "orange" | "green" | "blue";
  delay?: number;
}) {
  const colors = {
    orange: "text-bloom-orange bg-bloom-orange-dim border-bloom-border-hover",
    green:  "text-emerald-400 bg-emerald-900/20 border-emerald-800/30",
    blue:   "text-sky-400 bg-sky-900/20 border-sky-800/30",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease }}
      className="glass-card p-5 flex flex-col gap-3"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colors[color]}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-2xl font-bold text-bloom-text">{value}</p>
        <p className="text-xs font-semibold text-bloom-text-muted mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-bloom-text-muted/60 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function PerformancePage() {
  const [trades, setTrades]   = useState<TradeRecord[]>([]);
  const [stats, setStats]     = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [histRes, perfRes] = await Promise.all([
        fetch("/api/copy-trade/history"),
        fetch("/api/copy-trade/performance"),
      ]);
      if (histRes.ok) {
        const j = await histRes.json();
        setTrades(Array.isArray(j?.data) ? j.data : []);
      }
      if (perfRes.ok) {
        const j = await perfRes.json();
        setStats(j?.data ?? null);
      }
    } catch {
      // keep last data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-28 pb-16 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex items-start justify-between mb-8"
        >
          <div>
            <div className="pill-badge-orange mb-3">
              <Trophy size={11} /> PERFORMANCE ANALYTICS
            </div>
            <h1 className="text-3xl font-bold text-bloom-text">Strategy Performance</h1>
            <p className="text-bloom-text-muted text-sm mt-1">
              Verified session trades only — no simulated KPIs or fabricated win rates
            </p>
          </div>
          <button
            onClick={fetchData}
            className="orange-btn-outline flex items-center gap-2 text-sm px-4 py-2 mt-1"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <KpiCard
            label="Total Trades"
            value={stats ? String(stats.totalTrades) : "—"}
            sub="executed this session"
            icon={Activity}
            color="orange"
            delay={0}
          />
          <KpiCard
            label="Blocked by Sentinel"
            value={stats ? String(stats.blockedTrades) : "—"}
            sub="risk checks failed"
            icon={Shield}
            color="blue"
            delay={0.07}
          />
          <KpiCard
            label="Total Executed"
            value={stats && stats.totalExecutedUSD > 0
              ? `$${stats.totalExecutedUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "—"}
            sub="USD notional"
            icon={BarChart3}
            color="blue"
            delay={0.14}
          />
          <KpiCard
            label="Verified P&L"
            value={stats && stats.totalTrades > 0
              ? `${stats.verifiedPnlUSD >= 0 ? "+" : ""}$${stats.verifiedPnlUSD.toFixed(2)}`
              : "—"}
            sub={
              stats?.winRate != null
                ? `${stats.winRate.toFixed(1)}% win rate · ${stats.mtmTrades ?? 0} MTM`
                : "mark-to-market from SoDEX marks"
            }
            icon={TrendingUp}
            color="green"
            delay={0.21}
          />
          <KpiCard
            label="Live vs Simulated"
            value={stats ? `${stats.liveTrades} / ${stats.simulatedTrades}` : "—"}
            sub="live · simulated fills"
            icon={Zap}
            color="green"
            delay={0.28}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-bloom-text">Session Trade History</h2>
              <p className="text-xs text-bloom-text-muted mt-0.5">Persisted to local trade store — only real executions</p>
            </div>
            {trades.length > 0 && (
              <span className="text-[10px] text-bloom-text-muted">{trades.length} trades</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 shimmer rounded-xl" />)}
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-12 text-bloom-text-muted">
              <Activity size={32} className="mx-auto mb-3 text-bloom-border" />
              <p className="text-sm">No executed trades yet.</p>
              <p className="text-xs mt-1">
                Run the agent pipeline, then confirm a copy-trade on{" "}
                <a href="/copy-trade" className="text-bloom-orange hover:underline">Copy Trade</a>.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-bloom-text-muted uppercase tracking-wider border-b border-bloom-border">
                    <th className="pb-2 text-left font-semibold">Time</th>
                    <th className="pb-2 text-left font-semibold">Strategy</th>
                    <th className="pb-2 text-left font-semibold">Symbol</th>
                    <th className="pb-2 text-right font-semibold">Allocation</th>
                    <th className="pb-2 text-right font-semibold">Mode</th>
                    <th className="pb-2 text-right font-semibold">Status</th>
                    <th className="pb-2 text-right font-semibold">Explorer</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => (
                    <tr key={t.id} className="border-b border-bloom-border/50 hover:bg-white/2 transition-colors">
                      <td className="py-3 text-bloom-text-muted">{timeAgo(t.timestamp)}</td>
                      <td className="py-3">
                        <code className="text-bloom-orange font-mono">{t.strategyId}</code>
                      </td>
                      <td className="py-3 font-mono text-bloom-text-muted">{t.symbol}</td>
                      <td className="py-3 text-right text-bloom-text font-medium">
                        ${t.allocationUSD.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          t.simulated
                            ? "bg-amber-900/20 text-amber-400"
                            : "bg-emerald-900/20 text-emerald-400"
                        }`}>
                          {t.simulated ? "SIMULATED" : "LIVE"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          t.sentinelStatus === "passed"
                            ? "bg-emerald-900/20 text-emerald-400"
                            : "bg-red-900/20 text-red-400"
                        }`}>
                          {t.sentinelStatus === "passed" ? "EXECUTED" : "BLOCKED"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {isOnChainTxHash(t.id) ? (
                          <a
                            href={`${VALUECHAIN_TESTNET.blockExplorerUrls[0]}/tx/${t.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-bloom-orange hover:underline"
                          >
                            <ExternalLink size={10} />
                            View
                          </a>
                        ) : (
                          <a
                            href={SODEX_TESTNET_TRADE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-bloom-orange hover:underline"
                            title="SoDEX fills are exchange orders — open SoDEX Trade History"
                          >
                            <ExternalLink size={10} />
                            SoDEX
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <p className="text-center text-[11px] text-bloom-text-muted/50 mt-6">
          Performance metrics reflect verified session trades only. Win rate and P&L require mark-to-market data on closed positions.
        </p>
      </main>
    </>
  );
}
