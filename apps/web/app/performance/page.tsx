"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Activity, BarChart3, ExternalLink, RefreshCw, Zap, Shield, Bot,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import Navbar from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import { VALUECHAIN_TESTNET, SODEX_TESTNET_TRADE_URL } from "@/lib/valuechain";

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
  pnlUSD?: number;
  source?: "manual" | "auto-copy";
  orders?: { symbol: string; fillPrice: number; fillQuantity: number; side: number }[];
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
  autoCopyTrades?: number;
  mtmTrades?: number;
  wins?: number;
  losses?: number;
  avgWinUSD?: number;
  avgLossUSD?: number;
  byStrategy?: Record<
    string,
    { trades: number; notional: number; simulated: number; pnlUSD: number; wins: number; mtm: number }
  >;
  byAsset?: Record<
    string,
    { fills: number; notional: number; qty: number; pnlUSD: number; avgFillPrice: number }
  >;
  byDay?: { date: string; trades: number; notional: number; pnlUSD: number }[];
  equityCurve?: { t: string; pnl: number; cumulative: number }[];
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

const tipStyle = {
  background: "#1A0C05",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  fontSize: 12,
};

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

  const assetRows = Object.entries(stats?.byAsset ?? {})
    .map(([symbol, v]) => ({ symbol, ...v }))
    .sort((a, b) => b.notional - a.notional);

  const strategyRows = Object.entries(stats?.byStrategy ?? {})
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.notional - a.notional);

  const equity = (stats?.equityCurve ?? []).map((p) => ({
    ...p,
    label: p.t.slice(5, 16).replace("T", " "),
  }));

  const dayBars = (stats?.byDay ?? []).map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4 max-w-6xl mx-auto">
        <PageHeader
          eyebrow="Step 4 · Results"
          live
          title={
            <>
              Strategy <span className="orange-gradient-text">performance</span>
            </>
          }
          subtitle="Verified SoDEX fills + mark-to-market — by asset, strategy, and day. No fabricated win rates."
          actions={
            <button
              onClick={fetchData}
              className="orange-btn-outline flex items-center gap-2 text-sm px-4 py-2"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          }
        />

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
            delay={0.05}
          />
          <KpiCard
            label="Total Executed"
            value={stats && stats.totalExecutedUSD > 0
              ? `$${stats.totalExecutedUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "—"}
            sub="USD notional"
            icon={BarChart3}
            color="blue"
            delay={0.1}
          />
          <KpiCard
            label="Verified P&L"
            value={stats && (stats.mtmTrades ?? 0) > 0
              ? `${stats.verifiedPnlUSD >= 0 ? "+" : ""}$${stats.verifiedPnlUSD.toFixed(2)}`
              : "—"}
            sub={
              stats?.winRate != null
                ? `${stats.winRate.toFixed(1)}% win · ${stats.wins ?? 0}W/${stats.losses ?? 0}L`
                : "mark-to-market from SoDEX marks"
            }
            icon={TrendingUp}
            color="green"
            delay={0.15}
          />
          <KpiCard
            label="Auto-Copy / Live"
            value={stats ? `${stats.autoCopyTrades ?? 0} / ${stats.liveTrades}` : "—"}
            sub={`sim ${stats?.simulatedTrades ?? 0} · DD $${stats?.maxDrawdownUSD?.toFixed(0) ?? "0"}`}
            icon={Bot}
            color="green"
            delay={0.2}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="glass-card p-5">
            <h2 className="text-sm font-bold text-bloom-text mb-1">Equity curve</h2>
            <p className="text-[11px] text-bloom-text-muted mb-4">Cumulative verified MTM PnL</p>
            {equity.length < 2 ? (
              <div className="h-48 flex items-center justify-center text-xs text-bloom-text-muted">
                Need MTM fills to plot equity
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equity}>
                    <defs>
                      <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E8610A" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#E8610A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#A8A09A", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#A8A09A", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={tipStyle} />
                    <Area type="monotone" dataKey="cumulative" stroke="#E8610A" fill="url(#eq)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-bold text-bloom-text mb-1">Daily notional</h2>
            <p className="text-[11px] text-bloom-text-muted mb-4">Executed USD by day</p>
            {dayBars.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-bloom-text-muted">
                No daily volume yet
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayBars}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#A8A09A", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#A8A09A", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={tipStyle} />
                    <Bar dataKey="notional" fill="#E8610A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="glass-card p-5">
            <h2 className="text-sm font-bold text-bloom-text mb-3">By asset</h2>
            {assetRows.length === 0 ? (
              <p className="text-xs text-bloom-text-muted py-8 text-center">No fills yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-bloom-text-muted border-b border-bloom-border">
                      <th className="pb-2 text-left">Asset</th>
                      <th className="pb-2 text-right">Fills</th>
                      <th className="pb-2 text-right">Notional</th>
                      <th className="pb-2 text-right">MTM PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetRows.map((a) => (
                      <tr key={a.symbol} className="border-b border-bloom-border/40">
                        <td className="py-2.5 font-mono font-semibold text-bloom-orange">{a.symbol}</td>
                        <td className="py-2.5 text-right text-bloom-text">{a.fills}</td>
                        <td className="py-2.5 text-right text-bloom-text">${a.notional.toLocaleString()}</td>
                        <td className={`py-2.5 text-right font-semibold ${a.pnlUSD >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {a.pnlUSD >= 0 ? "+" : ""}${a.pnlUSD.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-bold text-bloom-text mb-3">By strategy</h2>
            {strategyRows.length === 0 ? (
              <p className="text-xs text-bloom-text-muted py-8 text-center">No strategies traded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-bloom-text-muted border-b border-bloom-border">
                      <th className="pb-2 text-left">Strategy</th>
                      <th className="pb-2 text-right">Trades</th>
                      <th className="pb-2 text-right">Notional</th>
                      <th className="pb-2 text-right">MTM PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategyRows.map((s) => (
                      <tr key={s.id} className="border-b border-bloom-border/40">
                        <td className="py-2.5">
                          <code className="text-bloom-orange font-mono">{s.id}</code>
                        </td>
                        <td className="py-2.5 text-right text-bloom-text">{s.trades}</td>
                        <td className="py-2.5 text-right text-bloom-text">${s.notional.toLocaleString()}</td>
                        <td className={`py-2.5 text-right font-semibold ${s.pnlUSD >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {s.mtm > 0 ? `${s.pnlUSD >= 0 ? "+" : ""}$${s.pnlUSD.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-bloom-text">Session Trade History</h2>
              <p className="text-xs text-bloom-text-muted mt-0.5">Real executions only — manual + Auto-Copy</p>
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
              <p className="text-sm font-semibold text-bloom-text mb-1">No executed trades yet</p>
              <p className="text-xs max-w-sm mx-auto mb-4">
                Run a copy-trade or enable Auto-Copy on Trade, then re-run the pipeline.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <a href="/strategies" className="orange-btn-outline text-xs px-4 py-2">Browse strategies</a>
                <a href="/copy-trade" className="orange-btn text-xs px-4 py-2">Go to Trade</a>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-bloom-text-muted uppercase tracking-wider border-b border-bloom-border">
                    <th className="pb-2 text-left font-semibold">Time</th>
                    <th className="pb-2 text-left font-semibold">Strategy</th>
                    <th className="pb-2 text-left font-semibold">Source</th>
                    <th className="pb-2 text-right font-semibold">Allocation</th>
                    <th className="pb-2 text-right font-semibold">MTM</th>
                    <th className="pb-2 text-right font-semibold">Mode</th>
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
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                          t.source === "auto-copy"
                            ? "bg-sky-900/20 text-sky-400"
                            : "bg-white/5 text-bloom-text-muted"
                        }`}>
                          {t.source === "auto-copy" ? <><Bot size={10} /> Auto</> : "Manual"}
                        </span>
                      </td>
                      <td className="py-3 text-right text-bloom-text font-medium">
                        ${t.allocationUSD.toLocaleString()}
                      </td>
                      <td className={`py-3 text-right font-semibold ${
                        t.pnlUSD == null ? "text-bloom-text-muted" :
                        t.pnlUSD >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {t.pnlUSD == null ? "—" : `${t.pnlUSD >= 0 ? "+" : ""}$${t.pnlUSD.toFixed(2)}`}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          t.simulated
                            ? "bg-amber-900/20 text-amber-400"
                            : "bg-emerald-900/20 text-emerald-400"
                        }`}>
                          {t.simulated ? "SIM" : "LIVE"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {t.sentinelStatus === "passed" ? (
                          <a
                            href={SODEX_TESTNET_TRADE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-bloom-orange hover:underline"
                          >
                            SoDEX <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-red-400">Blocked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[10px] text-bloom-text-muted mt-4 flex items-center gap-1">
            <Zap size={10} />
            Chain {VALUECHAIN_TESTNET.chainId} · Explorer {VALUECHAIN_TESTNET.blockExplorerUrls[0]}
          </p>
        </motion.div>
      </main>
    </>
  );
}
