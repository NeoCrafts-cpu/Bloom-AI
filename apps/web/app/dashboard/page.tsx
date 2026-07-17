"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Activity, BarChart3, Layers,
  Zap, ArrowUpRight, RefreshCw, Brain, Globe, ChevronDown, LineChart,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AgentStatusBar from "@/components/AgentStatusBar";
import MarketTicker from "@/components/MarketTicker";
import ETFFlowsPanel from "@/components/ETFFlowsPanel";
import { PageHeader } from "@/components/PageHeader";
import type { MarketSnapshot, ETFFlowData, SmartMoneyNewsletter } from "@bloom-ai/types";
import { panelStatusLabel, PANEL_STATUS_STYLES, type PanelDataStatus } from "@/lib/api";

const PriceKlinesChart  = dynamic(() => import("@/components/PriceKlinesChart"),  { ssr: false });
const ETFHistoryChart   = dynamic(() => import("@/components/ETFHistoryChart"),   { ssr: false });
const DefiTVLPanel      = dynamic(() => import("@/components/DefiTVLPanel"),      { ssr: false });
const PerpsPositionsPanel = dynamic(() => import("@/components/PerpsPositionsPanel"), { ssr: false });
const VCFundingPanel    = dynamic(() => import("@/components/VCFundingPanel"),    { ssr: false });
const LiveOrderBook     = dynamic(() => import("@/components/LiveOrderBook"),     { ssr: false });
const MarketHeatmap     = dynamic(() => import("@/components/MarketHeatmap"),     { ssr: false });
const OpportunityFeedPanel = dynamic(() => import("@/components/OpportunityFeedPanel"), { ssr: false });
const AlertsPanel = dynamic(() => import("@/components/AlertsPanel"), { ssr: false });

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const API = "";

const JOURNEY = [
  { step: "1", title: "Discover", desc: "Signals & charts", href: "/research", icon: LineChart },
  { step: "2", title: "Strategies", desc: "Pick an SSI basket", href: "/strategies", icon: Layers },
  { step: "3", title: "Trade", desc: "Execute on SoDEX", href: "/copy-trade", icon: Zap },
  { step: "4", title: "Results", desc: "Fills & performance", href: "/performance", icon: BarChart3 },
];

function StatusBadge({ status }: { status: PanelDataStatus }) {
  const style = PANEL_STATUS_STYLES[status] ?? PANEL_STATUS_STYLES.unavailable;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style}`}>
      {panelStatusLabel(status)}
    </span>
  );
}

function fmt(n: number, decimals = 2) {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(decimals)}`;
}

export default function DashboardPage() {
  const [prices, setPrices] = useState<MarketSnapshot[]>([]);
  const [etf, setEtf] = useState<ETFFlowData[]>([]);
  const [newsletters, setNews] = useState<SmartMoneyNewsletter[]>([]);
  const [pricesStatus, setPricesStatus] = useState<PanelDataStatus>("unavailable");
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      fetch(`${API}/api/market/prices`).then(async (r) => {
        const j = await r.json();
        if (!r.ok) {
          setPricesStatus("unavailable");
          return;
        }
        const list = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        setPrices(list);
        const metaStatus = j?.meta?.status as PanelDataStatus | undefined;
        setPricesStatus(metaStatus ?? (list.length ? "live" : "empty"));
      }),
      fetch(`${API}/api/market/etf-flows`).then(async (r) => {
        const j = await r.json();
        if (!r.ok) return;
        const list = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        setEtf(list);
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
      <div className="pt-24 max-w-[1400px] mx-auto px-4 pb-12">
        <PageHeader
          showFlow={false}
          eyebrow="Home"
          live
          title={
            <>
              Start here — <span className="orange-gradient-text">then trade</span>
            </>
          }
          subtitle="Run the agent pipeline, pick a strategy, execute on SoDEX. Deeper market tools live under Discover."
          actions={
            <button
              onClick={fetchAll}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-bloom-border text-sm text-bloom-text-muted hover:text-bloom-text hover:border-bloom-border-hover transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {JOURNEY.map((j) => (
            <Link
              key={j.href}
              href={j.href}
              className="glass-card p-4 hover:border-bloom-border-hover transition-colors group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-bloom-orange text-bloom-bg text-[11px] font-bold flex items-center justify-center">
                  {j.step}
                </span>
                <j.icon size={14} className="text-bloom-orange" />
              </div>
              <p className="text-sm font-bold text-bloom-text group-hover:text-bloom-orange transition-colors">
                {j.title}
              </p>
              <p className="text-[11px] text-bloom-text-muted mt-0.5">{j.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mb-4">
          <AgentStatusBar />
        </div>
        <MarketTicker />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
              label: "ETF Net Flow",
              value: fmt(totalEtfFlow),
              sub: totalEtfFlow >= 0 ? "Net Inflow" : "Net Outflow",
              positive: totalEtfFlow >= 0,
              icon: BarChart3,
            },
            {
              label: "Next step",
              value: "Strategies",
              sub: "After pipeline runs",
              positive: true,
              icon: Layers,
            },
          ].map((kpi) => (
            <div key={kpi.label} className="glass-card p-5">
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
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
                  <Globe size={12} className="text-bloom-orange" />
                </div>
                <h2 className="text-sm font-bold text-bloom-text">Live Crypto Prices</h2>
              </div>
              <StatusBadge status={pricesStatus} />
            </div>
            {prices.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-bloom-text-muted">
                {pricesStatus === "unavailable" ? "Price data offline" : "No price data available"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-bloom-text-muted border-b border-bloom-border">
                      <th className="pb-2 text-left font-semibold">Asset</th>
                      <th className="pb-2 text-right font-semibold">Price</th>
                      <th className="pb-2 text-right font-semibold">24h</th>
                      <th className="pb-2 text-right font-semibold hidden md:table-cell">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.slice(0, 8).map((p) => (
                      <tr key={p.symbol} className="border-b border-bloom-border/50">
                        <td className="py-3 font-semibold text-bloom-text">{p.symbol}</td>
                        <td className="py-3 text-right font-mono text-bloom-text">
                          ${p.price.toLocaleString(undefined, { maximumFractionDigits: p.price < 1 ? 4 : 2 })}
                        </td>
                        <td className={`py-3 text-right font-semibold ${p.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          <span className="inline-flex items-center gap-1 justify-end w-full">
                            {p.change24h >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {p.change24h >= 0 ? "+" : ""}{p.change24h.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 text-right text-bloom-text-muted hidden md:table-cell">
                          {fmt(p.volume24h)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <ETFFlowsPanel />

          <div className="xl:col-span-2 glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
                  <Brain size={12} className="text-bloom-orange" />
                </div>
                <h2 className="text-sm font-bold text-bloom-text">Latest AI Intelligence</h2>
              </div>
              <Link href="/terminal" className="text-xs text-bloom-orange hover:underline flex items-center gap-1">
                Open News <ArrowUpRight size={11} />
              </Link>
            </div>
            {newsletters.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center gap-2 text-center px-4">
                <p className="text-xs text-bloom-text-muted">No newsletters yet — run the pipeline above.</p>
                <Link href="/terminal" className="text-xs text-bloom-orange hover:underline">
                  Go to News terminal
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {newsletters.map((nl) => (
                  <Link
                    key={nl.id}
                    href="/terminal"
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/3 border border-transparent hover:border-bloom-border"
                  >
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${nl.narrative === "risk-on" ? "bg-emerald-400" : nl.narrative === "risk-off" ? "bg-red-400" : "bg-amber-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-bloom-text leading-tight">{nl.title}</p>
                      <p className="text-xs text-bloom-text-muted mt-0.5 line-clamp-1">{nl.summary}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-5 flex flex-col gap-3">
            <h2 className="text-sm font-bold text-bloom-text mb-1">Continue</h2>
            {[
              { label: "Discover signals", desc: "Charts · opportunities · institutional", href: "/research", icon: LineChart },
              { label: "Browse strategies", desc: "Review SSI baskets", href: "/strategies", icon: Layers },
              { label: "Execute copy trade", desc: "Wallet → Sentinel → SoDEX", href: "/copy-trade", icon: Zap },
              { label: "View performance", desc: "Live fills & mark-to-market", href: "/performance", icon: BarChart3 },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-xl border border-bloom-border hover:border-bloom-border-hover hover:bg-white/3 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-bloom-bg-card border border-bloom-border flex items-center justify-center shrink-0">
                  <action.icon size={14} className="text-bloom-orange" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-bloom-text">{action.label}</p>
                  <p className="text-xs text-bloom-text-muted">{action.desc}</p>
                </div>
                <ArrowUpRight size={13} className="text-bloom-text-muted group-hover:text-bloom-orange shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-3 mb-4 group"
          >
            <div className="pill-badge-orange w-fit">
              <span className="live-dot" />
              Optional
            </div>
            <h2 className="text-lg font-bold text-bloom-text">
              Market depth{" "}
              <span className="text-bloom-text-muted font-normal text-sm">(charts, books, alerts)</span>
            </h2>
            <ChevronDown
              size={18}
              className={`text-bloom-text-muted transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
          </button>

          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease }}
            >
              <p className="text-xs text-bloom-text-muted mb-4">
                Prefer a focused workspace?{" "}
                <Link href="/research" className="text-bloom-orange hover:underline">
                  Open Discover
                </Link>
              </p>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
                <div className="xl:col-span-2"><PriceKlinesChart /></div>
                <div><DefiTVLPanel /></div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
                <OpportunityFeedPanel compact limit={6} className="xl:col-span-1" />
                <ETFHistoryChart />
                <MarketHeatmap />
              </div>
              <div className="mb-5"><LiveOrderBook /></div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <PerpsPositionsPanel />
                <VCFundingPanel />
                <AlertsPanel />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
