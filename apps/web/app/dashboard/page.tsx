"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Activity, BarChart3, Layers,
  Zap, ArrowUpRight, RefreshCw, Brain, Shield, Globe,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AgentStatusBar from "@/components/AgentStatusBar";
import MarketTicker from "@/components/MarketTicker";
import ETFFlowsPanel from "@/components/ETFFlowsPanel";
import ETFHistoryChart from "@/components/ETFHistoryChart";
import DefiTVLPanel from "@/components/DefiTVLPanel";
import PerpsPositionsPanel from "@/components/PerpsPositionsPanel";
import VCFundingPanel from "@/components/VCFundingPanel";
import LiveOrderBook from "@/components/LiveOrderBook";
import MarketHeatmap from "@/components/MarketHeatmap";
import type { MarketSnapshot, ETFFlowData, SmartMoneyNewsletter } from "@bloom-ai/types";

// dynamic import — lightweight-charts requires DOM, can't run on server
const PriceKlinesChart = dynamic(() => import("@/components/PriceKlinesChart"), { ssr: false });

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const API = "";

const MOCK_PRICES: MarketSnapshot[] = [
  { symbol: "BTC", price: 97420, change24h: 3.2, volume24h: 38_400_000_000, marketCap: 1_920_000_000_000, updatedAt: new Date().toISOString() },
  { symbol: "ETH", price: 3840,  change24h: 4.1, volume24h: 22_100_000_000, marketCap: 461_000_000_000,   updatedAt: new Date().toISOString() },
  { symbol: "SOL", price: 198,   change24h: 5.7, volume24h: 8_200_000_000,  marketCap: 93_000_000_000,    updatedAt: new Date().toISOString() },
  { symbol: "BNB", price: 612,   change24h: 1.8, volume24h: 2_900_000_000,  marketCap: 88_000_000_000,    updatedAt: new Date().toISOString() },
  { symbol: "AVAX", price: 38.9, change24h: -1.4, volume24h: 1_200_000_000, marketCap: 16_000_000_000,   updatedAt: new Date().toISOString() },
  { symbol: "LINK", price: 17.8, change24h: 3.9,  volume24h: 900_000_000,   marketCap: 11_000_000_000,   updatedAt: new Date().toISOString() },
];

const MOCK_ETF_FLOWS: ETFFlowData[] = [
  { date: new Date().toISOString().slice(0, 10), ticker: "IBIT", netInflow: -27_222_000, totalAUM: 65_744_759_600, change24h: -0.04 },
  { date: new Date().toISOString().slice(0, 10), ticker: "FBTC", netInflow: 118_000_000, totalAUM: 22_100_000_000, change24h: 0.53 },
  { date: new Date().toISOString().slice(0, 10), ticker: "ETHA", netInflow: -4_200_000,  totalAUM: 2_800_000_000,  change24h: -0.15 },
];

function fmt(n: number, decimals = 2) {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(decimals)}`;
}

export default function DashboardPage() {
  const [prices, setPrices]       = useState<MarketSnapshot[]>(MOCK_PRICES);
  const [etf, setEtf]             = useState<ETFFlowData[]>(MOCK_ETF_FLOWS);
  const [newsletters, setNews]    = useState<SmartMoneyNewsletter[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      fetch(`${API}/api/market/prices`).then(async (r) => {
        if (!r.ok) return;
        const j = await r.json();
        const list = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : null;
        if (list?.length) setPrices(list);
      }),
      fetch(`${API}/api/market/etf-flows`).then(async (r) => {
        if (!r.ok) return;
        const j = await r.json();
        const list = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : null;
        if (list?.length) setEtf(list);
      }),
      fetch(`${API}/api/newsletters?limit=4`).then(async (r) => {
        if (!r.ok) return;
        const j = await r.json();
        const list = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : null;
        if (list?.length) setNews(list);
      }),
    ]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30_000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const totalEtfFlow = etf.reduce((s, f) => s + f.netInflow, 0);
  const btcPrice = prices.find((p) => p.symbol === "BTC");
  const ethPrice = prices.find((p) => p.symbol === "ETH");

  return (
    <div className="min-h-screen bg-bloom-bg">
      <Navbar />
      <div className="pt-28 max-w-[1400px] mx-auto px-4 pb-12">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="flex items-center justify-between mt-6 mb-6"
        >
          <div>
            <div className="pill-badge-orange mb-2 w-fit">
              <span className="live-dot" />
              Live Markets
            </div>
            <h1 className="text-3xl font-bold text-bloom-text">
              Market{" "}
              <span className="orange-gradient-text">Dashboard</span>
            </h1>
            <p className="text-bloom-text-muted text-sm mt-1">
              Real-time crypto prices · ETF fund flows · AI intelligence — all in one place
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-bloom-border text-sm text-bloom-text-muted hover:text-bloom-text hover:border-bloom-border-hover transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </motion.div>

        {/* Agent status */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08, ease }}>
          <AgentStatusBar />
        </motion.div>

        {/* Market ticker */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.14, ease }}>
          <MarketTicker />
        </motion.div>

        {/* KPI strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          {[
            {
              label: "BTC Price",
              value: btcPrice ? `$${btcPrice.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—",
              sub: btcPrice ? `${btcPrice.change24h >= 0 ? "+" : ""}${btcPrice.change24h.toFixed(2)}% 24h` : "",
              positive: (btcPrice?.change24h ?? 0) >= 0,
              icon: TrendingUp,
            },
            {
              label: "ETH Price",
              value: ethPrice ? `$${ethPrice.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—",
              sub: ethPrice ? `${ethPrice.change24h >= 0 ? "+" : ""}${ethPrice.change24h.toFixed(2)}% 24h` : "",
              positive: (ethPrice?.change24h ?? 0) >= 0,
              icon: Activity,
            },
            {
              label: "ETF Net Flow (Today)",
              value: fmt(totalEtfFlow),
              sub: totalEtfFlow >= 0 ? "Net Inflow" : "Net Outflow",
              positive: totalEtfFlow >= 0,
              icon: BarChart3,
            },
            {
              label: "AI Newsletters",
              value: "Live",
              sub: "SoSoValue powered",
              positive: true,
              icon: Brain,
            },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              whileHover={{ scale: 1.02, borderColor: "rgba(232,97,10,0.3)" }}
              transition={{ duration: 0.15 }}
              className="glass-card p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-bloom-text-muted uppercase tracking-wider font-medium">{kpi.label}</p>
                <div className="w-7 h-7 rounded-lg bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
                  <kpi.icon size={12} className="text-bloom-orange" />
                </div>
              </div>
              <p className="text-2xl font-bold text-bloom-text">{kpi.value}</p>
              {kpi.sub && (
                <p className={`text-xs mt-1 font-medium ${kpi.positive ? "text-emerald-400" : "text-red-400"}`}>
                  {kpi.sub}
                </p>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Left: crypto prices table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease }}
            className="xl:col-span-2 glass-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
                  <Globe size={12} className="text-bloom-orange" />
                </div>
                <h2 className="text-sm font-bold text-bloom-text">Live Crypto Prices</h2>
              </div>
              <span className="text-xs text-bloom-text-muted">via CoinGecko</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-bloom-text-muted border-b border-bloom-border">
                    <th className="pb-2 text-left font-semibold">Asset</th>
                    <th className="pb-2 text-right font-semibold">Price</th>
                    <th className="pb-2 text-right font-semibold">24h</th>
                    <th className="pb-2 text-right font-semibold hidden md:table-cell">Volume</th>
                    <th className="pb-2 text-right font-semibold hidden lg:table-cell">Market Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p, i) => (
                    <motion.tr
                      key={p.symbol}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.05 * i }}
                      className="border-b border-bloom-border/50 hover:bg-white/2 transition-colors"
                    >
                      <td className="py-3 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center text-xs font-bold text-bloom-orange">
                          {p.symbol.slice(0, 1)}
                        </div>
                        <span className="font-semibold text-bloom-text">{p.symbol}</span>
                      </td>
                      <td className="py-3 text-right font-mono text-bloom-text">
                        ${p.price.toLocaleString(undefined, { maximumFractionDigits: p.price < 1 ? 4 : 2 })}
                      </td>
                      <td className={`py-3 text-right font-semibold ${p.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        <span className="flex items-center justify-end gap-1">
                          {p.change24h >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 text-right text-bloom-text-muted hidden md:table-cell">
                        {fmt(p.volume24h)}
                      </td>
                      <td className="py-3 text-right text-bloom-text-muted hidden lg:table-cell">
                        {p.marketCap ? fmt(p.marketCap) : "—"}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Right: ETF flows */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease }}
          >
            <ETFFlowsPanel />
          </motion.div>

          {/* Bottom: recent newsletters + quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease }}
            className="xl:col-span-2 glass-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
                  <Brain size={12} className="text-bloom-orange" />
                </div>
                <h2 className="text-sm font-bold text-bloom-text">Latest AI Intelligence</h2>
              </div>
              <Link href="/terminal" className="text-xs text-bloom-orange hover:underline flex items-center gap-1">
                Full Terminal <ArrowUpRight size={11} />
              </Link>
            </div>
            {newsletters.length === 0 ? (
              <div className="space-y-3">
                {[
                  { title: "BTC Spot ETF Inflows Signal Institutional Accumulation", narrative: "risk-on", time: "32m ago", assets: ["BTC", "IBIT"] },
                  { title: "DeFi TVL Crosses $120B — BLOOM-DEFI Rebalance Triggered", narrative: "rotation", time: "2h ago", assets: ["AAVE", "UNI"] },
                  { title: "Macro Risk-Off: Fed Minutes Drive Sentiment Shift", narrative: "risk-off", time: "4h ago", assets: ["USDC", "BTC"] },
                  { title: "SOL Ecosystem Activity Surges — MAG7 Weight Adjusted", narrative: "risk-on", time: "6h ago", assets: ["SOL", "JTO"] },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors border border-transparent hover:border-bloom-border cursor-pointer">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${item.narrative === "risk-on" ? "bg-emerald-400" : item.narrative === "risk-off" ? "bg-red-400" : "bg-amber-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-bloom-text leading-tight">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-bloom-text-muted">{item.time}</span>
                        {item.assets.map((a) => (
                          <span key={a} className="text-xs bg-bloom-orange-dim border border-bloom-border-hover text-bloom-orange rounded-md px-1.5 py-0.5 font-mono">{a}</span>
                        ))}
                      </div>
                    </div>
                    <ArrowUpRight size={13} className="text-bloom-text-muted shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {newsletters.map((nl, i) => (
                  <div key={nl.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors border border-transparent hover:border-bloom-border cursor-pointer">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${nl.narrative === "risk-on" ? "bg-emerald-400" : nl.narrative === "risk-off" ? "bg-red-400" : "bg-amber-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-bloom-text leading-tight">{nl.title}</p>
                      <p className="text-xs text-bloom-text-muted mt-0.5 line-clamp-1">{nl.summary}</p>
                    </div>
                    <ArrowUpRight size={13} className="text-bloom-text-muted shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease }}
            className="glass-card p-5 flex flex-col gap-3"
          >
            <h2 className="text-sm font-bold text-bloom-text mb-1">Quick Actions</h2>
            {[
              { label: "Smart Money Terminal", desc: "Live AI newsletters", href: "/terminal", icon: Brain, color: "text-bloom-orange" },
              { label: "On-Chain Strategies", desc: "Browse SSI indices", href: "/strategies", icon: Layers, color: "text-bloom-orange" },
              { label: "Copy Trade", desc: "Execute via SoDEX", href: "/copy-trade", icon: Zap, color: "text-emerald-400" },
              { label: "Sentinel Guard", desc: "Risk management", href: "/copy-trade", icon: Shield, color: "text-blue-400" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-xl border border-bloom-border hover:border-bloom-border-hover hover:bg-white/3 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-bloom-bg-card border border-bloom-border flex items-center justify-center shrink-0">
                  <action.icon size={14} className={action.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-bloom-text">{action.label}</p>
                  <p className="text-xs text-bloom-text-muted">{action.desc}</p>
                </div>
                <ArrowUpRight size={13} className="text-bloom-text-muted group-hover:text-bloom-orange transition-colors shrink-0" />
              </Link>
            ))}
          </motion.div>

        </div>

        {/* ── Market Intelligence Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease }}
          className="mt-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="pill-badge-orange w-fit">
              <span className="live-dot" />
              Market Intelligence
            </div>
            <h2 className="text-xl font-bold text-bloom-text">
              Advanced <span className="orange-gradient-text">Analytics</span>
            </h2>
          </div>

          {/* Row 1: Price Chart + DeFi TVL */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
            <div className="xl:col-span-2">
              <PriceKlinesChart />
            </div>
            <div>
              <DefiTVLPanel />
            </div>
          </div>

          {/* Row 2: ETF History + Market Heatmap */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
            <ETFHistoryChart />
            <MarketHeatmap />
          </div>

          {/* Row 3: Live Order Book (full width) */}
          <div className="mb-5">
            <LiveOrderBook />
          </div>

          {/* Row 4: Perps Positions + VC Funding */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <PerpsPositionsPanel />
            <VCFundingPanel />
          </div>
        </motion.div>

      </div>
    </div>
  );
}

