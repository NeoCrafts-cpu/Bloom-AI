"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Activity, BarChart3,
  ExternalLink, RefreshCw, Trophy, Zap,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Navbar from "@/components/Navbar";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const API  = "";

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
}

interface PerformanceStats {
  totalTrades: number;
  winRate: number;
  totalExecutedUSD: number;
  estimatedPnl: number;
  avgTradeUSD: number;
}

// Simulated 30-day cumulative return for P&L curve (deterministic seed)
function buildPnlCurve(trades: TradeRecord[]) {
  // Seed-based 30-day baseline returns (fixed, realistic-looking)
  const baseline = [
    0, 0.4, 0.9, 1.1, 0.8, 1.6, 2.3, 1.9, 2.8, 3.5,
    3.2, 4.1, 4.8, 5.2, 4.9, 5.7, 6.4, 6.1, 7.0, 7.5,
    7.2, 8.0, 8.6, 8.3, 9.1, 9.4, 8.8, 9.5, 10.2, 10.8,
  ];

  const now  = Date.now();
  const base = now - 29 * 86400000;

  return baseline.map((pct, i) => {
    const date = new Date(base + i * 86400000);
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    // Boost by actual trades on that day
    const dayTrades = trades.filter((t) => {
      const d = new Date(t.timestamp);
      return d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate();
    });
    const boost = dayTrades.reduce((s, t) => s + t.totalExecutedUSD * 0.001, 0);
    return { date: label, pnl: parseFloat((pct + boost).toFixed(2)) };
  });
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
  const [pnlData, setPnlData] = useState<{ date: string; pnl: number }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [histRes, perfRes] = await Promise.all([
        fetch(`${API}/api/copy-trade/history`),
        fetch(`${API}/api/copy-trade/performance`),
      ]);
      if (histRes.ok) {
        const j = await histRes.json();
        const list: TradeRecord[] = Array.isArray(j?.data) ? j.data : [];
        setTrades(list);
        setPnlData(buildPnlCurve(list));
      } else {
        setPnlData(buildPnlCurve([]));
      }
      if (perfRes.ok) {
        const j = await perfRes.json();
        setStats(j?.data ?? null);
      }
    } catch {
      setPnlData(buildPnlCurve([]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-28 pb-16 px-4 max-w-6xl mx-auto">

        {/* Header */}
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
              Simulated returns for BLOOM index strategies · Session trades logged in real-time
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

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Total Trades"
            value={stats ? String(stats.totalTrades) : "—"}
            sub="this session"
            icon={Activity}
            color="orange"
            delay={0}
          />
          <KpiCard
            label="Win Rate"
            value={stats && stats.totalTrades > 0 ? `${stats.winRate.toFixed(1)}%` : "—"}
            sub="68% target"
            icon={TrendingUp}
            color="green"
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
            label="Est. P&L"
            value={stats && stats.estimatedPnl > 0
              ? `+$${stats.estimatedPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : stats && stats.totalTrades > 0 ? "$0.00" : "—"}
            sub="~8.4% avg return"
            icon={Zap}
            color="green"
            delay={0.21}
          />
        </div>

        {/* P&L Curve */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28, ease }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-bloom-text">BLOOM-MAG7 Simulated Returns</h2>
              <p className="text-xs text-bloom-text-muted mt-0.5">30-day cumulative P&L · Deterministic simulation</p>
            </div>
            <span className="text-emerald-400 text-sm font-bold">+10.8%</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pnlData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#A8A09A", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: "#A8A09A", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#130804",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    color: "#F5F0E8",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, "Cumulative Return"]}
                  labelStyle={{ color: "#A8A09A" }}
                />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke="#E8610A"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#E8610A", stroke: "#F5A020" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Trade History */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-bloom-text">Session Trade History</h2>
              <p className="text-xs text-bloom-text-muted mt-0.5">Resets when Render API restarts</p>
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
              <p className="text-sm">No trades this session yet.</p>
              <p className="text-xs mt-1">
                Go to{" "}
                <a href="/copy-trade" className="text-bloom-orange hover:underline">Copy Trade</a>
                {" "}to execute your first strategy.
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
                    <th className="pb-2 text-right font-semibold">Status</th>
                    <th className="pb-2 text-right font-semibold">Explorer</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => (
                    <tr key={t.id} className="border-b border-bloom-border/50 hover:bg-white/2 transition-colors">
                      <td className="py-3 text-bloom-text-muted">{timeAgo(t.timestamp)}</td>
                      <td className="py-3">
                        <code className="text-bloom-orange font-mono">{t.strategyId.toUpperCase()}</code>
                      </td>
                      <td className="py-3 font-mono text-bloom-text-muted">{t.symbol}</td>
                      <td className="py-3 text-right text-bloom-text font-medium">
                        ${t.allocationUSD.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          t.sentinelStatus === "passed"
                            ? "bg-emerald-900/20 text-emerald-400"
                            : "bg-red-900/20 text-red-400"
                        }`}>
                          {t.sentinelStatus === "passed" ? "FILLED" : "BLOCKED"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <a
                          href={`https://testnet-scan.valuechain.xyz/tx/${t.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-bloom-orange hover:underline"
                        >
                          <ExternalLink size={10} />
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-bloom-text-muted/50 mt-6">
          Simulated returns are for demonstration purposes. Trade history is session-scoped and resets on API restart.
          Strategies execute on SoDEX Testnet.
        </p>
      </main>
    </>
  );
}
