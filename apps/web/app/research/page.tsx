"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart as LineChartIcon, Activity, BookOpen, GitMerge,
  Newspaper, Cpu, RefreshCw, TrendingUp, TrendingDown,
  Minus, AlertCircle, Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { panelStatusLabel, type PanelDataStatus } from "@/lib/api";

// Client-only components
const PriceKlinesChart = dynamic(() => import("@/components/PriceKlinesChart"), { ssr: false });
const LiveOrderBook    = dynamic(() => import("@/components/LiveOrderBook"),    { ssr: false });
const InstitutionalDataPanel = dynamic(() => import("@/components/InstitutionalDataPanel"), { ssr: false });
const AlertsPanel = dynamic(() => import("@/components/AlertsPanel"), { ssr: false });
const OpportunityFeedPanel = dynamic(() => import("@/components/OpportunityFeedPanel"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface SentimentItem {
  title: string;
  sentiment?: string;
  score?: number;
  source?: string;
  publishedAt?: string;
  url?: string;
}

interface SignalResult {
  title?: string;
  summary?: string;
  body?: string;
  narrative?: string;
  keyAssets?: string[];
  publishedAt?: string;
}

interface ConfluenceData {
  rsi: number | null;
  sma12: number | null;
  sma24: number | null;
  lastClose: number | null;
  pctChange: number | null;
  volumeTrend: "rising" | "falling" | "neutral" | null;
  trend: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "AVAX", "ARB", "OP"] as const;
type ResearchSymbol = (typeof SYMBOLS)[number];

const INTERVALS = [
  { label: "1m",  value: "1m"  },
  { label: "5m",  value: "5m"  },
  { label: "15m", value: "15m" },
  { label: "1h",  value: "1h"  },
  { label: "4h",  value: "4h"  },
  { label: "1d",  value: "1d"  },
] as const;
type ResearchInterval = (typeof INTERVALS)[number]["value"];

const TABS = [
  { id: "chart",       label: "Chart",       icon: LineChartIcon },
  { id: "signals",     label: "Signals",     icon: Cpu           },
  { id: "orderbook",   label: "Orderbook",   icon: BookOpen      },
  { id: "confluence",  label: "Confluence",  icon: GitMerge      },
  { id: "sentiment",   label: "Sentiment",   icon: Newspaper     },
  { id: "institutional", label: "Institutional", icon: Activity },
  { id: "opportunities", label: "Opportunities", icon: Zap },
] as const;
type TabId = (typeof TABS)[number]["id"];

// Map research symbol to SoDEX WS symbol for orderbook
const SODEX_SYMBOL: Record<string, string> = {
  BTC: "vBTC_vUSDC",
  ETH: "vETH_vUSDC",
  SOL: "vSOL_vUSDC",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Signals tab ─────────────────────────────────────────────────────────────

function SignalsPanel({ symbol }: { symbol: string }) {
  const [result, setResult]   = useState<SignalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [triggered, setTriggered] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Track elapsed time while loading to show cold-start message
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const triggerAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTriggered(true);
    setElapsed(0);
    try {
      const res  = await fetch("/api/agents/chartanalyst/trigger", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? json?.agent?.message ?? "Analysis failed");
      }
      if (json?.data?.title) {
        setResult(json.data);
        return;
      }
      // Fallback: load latest chart analysis from newsletter store
      const latestRes = await fetch("/api/newsletters/latest");
      if (latestRes.ok) {
        const latestJson = await latestRes.json();
        const nl = latestJson?.data;
        if (nl?.title?.startsWith("Chart Analysis")) {
          setResult(nl);
          return;
        }
      }
      throw new Error("No analysis content returned");
    } catch (e) {
      setError((e as Error).message || "Analysis failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!triggered) {
    return (
      <div className="glass-card p-8 flex flex-col items-center gap-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
          <Cpu size={24} className="text-bloom-orange" />
        </div>
        <div>
          <h3 className="text-base font-bold text-bloom-text mb-1">Chart Analyst Agent</h3>
          <p className="text-sm text-bloom-text-muted max-w-md">
            Fetches live OHLCV klines from SoDEX for BTC, ETH, and SOL, computes RSI, SMA, and trend signals,
            then generates LLM-powered commentary.
          </p>
        </div>
        <button
          onClick={triggerAnalysis}
          className="orange-btn flex items-center gap-2 px-6 py-2.5"
        >
          <Zap size={15} />
          Run AI Analysis
        </button>
        <p className="text-xs text-bloom-text-muted">Powered by SoDEX Klines + OpenRouter LLM</p>
      </div>
    );
  }

  if (loading) {
    const coldStart = elapsed >= 5;
    const progress  = Math.min((elapsed / 32) * 100, 95);
    return (
      <div className="glass-card p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-8 h-8 border-2 border-bloom-orange border-t-transparent rounded-full animate-spin" />
        <div>
          <p className="text-sm font-semibold text-bloom-text mb-1">
            {coldStart ? "Agent waking up…" : "Chart Analyst running…"}
          </p>
          <p className="text-xs text-bloom-text-muted">
            {coldStart
              ? "Render free-tier cold start — first analysis takes ~30s. Fetching klines + computing RSI/SMA + generating LLM commentary…"
              : "Fetching klines from SoDEX · Computing RSI/SMA · Generating commentary"}
          </p>
        </div>
        {coldStart && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-[10px] text-bloom-text-muted mb-1">
              <span>Progress</span>
              <span>{elapsed}s</span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-bloom-orange transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 flex items-center gap-3 text-red-400">
        <AlertCircle size={16} />
        <div>
          <p className="text-sm font-medium">Analysis failed</p>
          <p className="text-xs text-bloom-text-muted mt-0.5">{error} — Render may be cold-starting (~30s)</p>
        </div>
        <button onClick={triggerAnalysis} className="ml-auto orange-btn-outline text-xs px-3 py-1.5">Retry</button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Meta */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
              <Cpu size={14} className="text-bloom-orange" />
            </div>
            <div>
              <p className="text-xs font-semibold text-bloom-text">Chart Analyst · AI Signal</p>
              <p className="text-[10px] text-bloom-text-muted">
                {result.publishedAt ? timeAgo(result.publishedAt) : "Just now"}
              </p>
            </div>
          </div>
          {result.narrative && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              result.narrative === "risk-on"
                ? "bg-emerald-900/20 text-emerald-400 border-emerald-800/30"
                : result.narrative === "risk-off"
                ? "bg-red-900/20 text-red-400 border-red-800/30"
                : "bg-white/5 text-bloom-text-muted border-bloom-border"
            }`}>
              {result.narrative}
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-bloom-text mb-2">{result.title}</h3>
        {result.summary && (
          <p className="text-sm text-bloom-text-muted leading-relaxed mb-3">{result.summary}</p>
        )}
        {result.body && (
          <p className="text-sm text-bloom-text leading-relaxed whitespace-pre-wrap border-t border-bloom-border pt-3">
            {result.body}
          </p>
        )}

        {result.keyAssets && result.keyAssets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {result.keyAssets.map((a) => (
              <span key={a} className="pill-badge text-xs">{a}</span>
            ))}
          </div>
        )}
      </div>

      {/* Re-trigger */}
      <div className="flex justify-center">
        <button
          onClick={triggerAnalysis}
          className="orange-btn-outline flex items-center gap-2 text-xs px-4 py-2"
        >
          <RefreshCw size={12} />
          Run New Analysis
        </button>
      </div>
    </motion.div>
  );
}

// ─── Confluence tab ───────────────────────────────────────────────────────────

function ConfluencePanel({ symbol, interval }: { symbol: string; interval: string }) {
  const [data, setData]       = useState<ConfluenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const fetchConfluence = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const limit = interval === "1d" ? 60 : interval === "4h" ? 60 : 48;
      const res   = await fetch(`/api/market/klines/${symbol}?interval=${interval}&limit=${limit}`);
      if (!res.ok) throw new Error("klines unavailable");
      const json  = await res.json();
      const bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[] =
        Array.isArray(json?.data) ? json.data : [];

      if (bars.length < 14) {
        setData(null);
        return;
      }

      const closes  = bars.map((b) => b.close);
      const volumes = bars.map((b) => b.volume);
      const last    = closes[closes.length - 1];
      const sma12   = closes.slice(-12).reduce((s, v) => s + v, 0) / 12;
      const sma24   = closes.length >= 24 ? closes.slice(-24).reduce((s, v) => s + v, 0) / 24 : null;
      const open24h = closes[0];

      // RSI(14)
      let gains = 0, losses = 0;
      for (let i = closes.length - 14; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        if (d > 0) gains += d; else losses -= d;
      }
      const rs  = losses === 0 ? 100 : gains / losses;
      const rsi = 100 - 100 / (1 + rs);

      // Volume trend
      const recentVol = volumes.slice(-6).reduce((s, v) => s + v, 0) / 6;
      const prevVol   = volumes.slice(-12, -6).reduce((s, v) => s + v, 0) / 6;
      const volumeTrend: ConfluenceData["volumeTrend"] =
        recentVol > prevVol * 1.1 ? "rising" : recentVol < prevVol * 0.9 ? "falling" : "neutral";

      setData({
        rsi,
        sma12,
        sma24,
        lastClose: last,
        pctChange: ((last - open24h) / open24h) * 100,
        volumeTrend,
        trend: last > sma12 ? "above SMA12" : "below SMA12",
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => { fetchConfluence(); }, [fetchConfluence]);

  if (loading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-bloom-orange border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-bloom-text-muted">Computing indicators...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card p-6 text-center">
        <AlertCircle size={20} className="text-bloom-text-muted mx-auto mb-2" />
        <p className="text-sm text-bloom-text-muted">
          {error ? "Klines unavailable — Render may be cold-starting" : "Not enough data for indicators"}
        </p>
        <button onClick={fetchConfluence} className="orange-btn-outline text-xs px-4 py-1.5 mt-3">Retry</button>
      </div>
    );
  }

  function rsiSignal(r: number): { label: string; color: string } {
    if (r >= 70) return { label: "OVERBOUGHT", color: "text-red-400" };
    if (r <= 30) return { label: "OVERSOLD",   color: "text-emerald-400" };
    if (r >= 55) return { label: "BULLISH",    color: "text-emerald-400" };
    if (r <= 45) return { label: "BEARISH",    color: "text-red-400" };
    return { label: "NEUTRAL", color: "text-amber-400" };
  }

  function smaCrossSignal(price: number, sma: number | null): { label: string; color: string } {
    if (!sma) return { label: "N/A", color: "text-bloom-text-muted" };
    const pct = ((price - sma) / sma) * 100;
    if (pct > 2)  return { label: "ABOVE (+)", color: "text-emerald-400" };
    if (pct < -2) return { label: "BELOW (−)", color: "text-red-400" };
    return { label: "AT",       color: "text-amber-400" };
  }

  const rsiSig  = rsiSignal(data.rsi!);
  const sma12Sig = smaCrossSignal(data.lastClose!, data.sma12);
  const sma24Sig = smaCrossSignal(data.lastClose!, data.sma24);

  const indicators = [
    {
      name: "RSI (14)",
      value: data.rsi?.toFixed(1) ?? "—",
      signal: rsiSig.label,
      signalColor: rsiSig.color,
      bar: Math.min(100, Math.max(0, data.rsi ?? 50)),
      barColor: data.rsi! >= 70 ? "bg-red-500" : data.rsi! <= 30 ? "bg-emerald-500" : "bg-amber-500",
    },
    {
      name: "Price vs SMA12",
      value: data.sma12 ? `$${data.sma12.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—",
      signal: sma12Sig.label,
      signalColor: sma12Sig.color,
      bar: 50,
      barColor: sma12Sig.label.startsWith("ABOVE") ? "bg-emerald-500" : sma12Sig.label.startsWith("BELOW") ? "bg-red-500" : "bg-amber-500",
    },
    {
      name: "Price vs SMA24",
      value: data.sma24 ? `$${data.sma24.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "Insufficient data",
      signal: sma24Sig.label,
      signalColor: sma24Sig.color,
      bar: 50,
      barColor: sma24Sig.label.startsWith("ABOVE") ? "bg-emerald-500" : sma24Sig.label.startsWith("BELOW") ? "bg-red-500" : "bg-amber-500",
    },
    {
      name: "Volume Trend",
      value: `${data.volumeTrend ?? "neutral"}`,
      signal: data.volumeTrend === "rising" ? "BULLISH" : data.volumeTrend === "falling" ? "BEARISH" : "NEUTRAL",
      signalColor: data.volumeTrend === "rising" ? "text-emerald-400" : data.volumeTrend === "falling" ? "text-red-400" : "text-amber-400",
      bar: data.volumeTrend === "rising" ? 70 : data.volumeTrend === "falling" ? 30 : 50,
      barColor: data.volumeTrend === "rising" ? "bg-emerald-500" : data.volumeTrend === "falling" ? "bg-red-500" : "bg-amber-500",
    },
    {
      name: `24h Change (${interval})`,
      value: data.pctChange !== null ? `${(data.pctChange ?? 0) >= 0 ? "+" : ""}${(data.pctChange ?? 0).toFixed(2)}%` : "—",
      signal: (data.pctChange ?? 0) > 1 ? "BULLISH" : (data.pctChange ?? 0) < -1 ? "BEARISH" : "NEUTRAL",
      signalColor: (data.pctChange ?? 0) > 1 ? "text-emerald-400" : (data.pctChange ?? 0) < -1 ? "text-red-400" : "text-amber-400",
      bar: Math.min(100, Math.max(0, 50 + ((data.pctChange ?? 0) * 5))),
      barColor: (data.pctChange ?? 0) > 0 ? "bg-emerald-500" : "bg-red-500",
    },
  ];

  // Overall confluence score
  const bullish = indicators.filter((i) => i.signal === "BULLISH" || i.signal === "ABOVE (+)" || i.signal === "OVERSOLD").length;
  const bearish = indicators.filter((i) => i.signal === "BEARISH" || i.signal === "BELOW (−)" || i.signal === "OVERBOUGHT").length;
  const overall = bullish > bearish ? "BULLISH" : bearish > bullish ? "BEARISH" : "NEUTRAL";
  const overallColor = overall === "BULLISH" ? "text-emerald-400" : overall === "BEARISH" ? "text-red-400" : "text-amber-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Overall score */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-bloom-text-muted mb-1">Confluence Score — {symbol}/{interval}</p>
          <p className={`text-2xl font-bold ${overallColor}`}>{overall}</p>
          <p className="text-xs text-bloom-text-muted mt-1">
            {bullish} bullish · {bearish} bearish · {indicators.length - bullish - bearish} neutral signals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchConfluence} className="p-1.5 rounded-lg hover:bg-white/5 text-bloom-text-muted">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Indicator rows */}
      <div className="glass-card divide-y divide-bloom-border">
        {indicators.map((ind) => (
          <div key={ind.name} className="px-5 py-3.5 flex items-center gap-4">
            <div className="w-36 shrink-0">
              <p className="text-xs font-semibold text-bloom-text">{ind.name}</p>
            </div>
            <div className="flex-1">
              <div className="h-1 bg-bloom-card-hover rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${ind.barColor} transition-all duration-500`}
                  style={{ width: `${ind.bar}%` }}
                />
              </div>
            </div>
            <div className="w-28 text-right shrink-0">
              <p className="text-xs text-bloom-text-muted">{ind.value}</p>
            </div>
            <div className="w-24 text-right shrink-0">
              <span className={`text-xs font-bold ${ind.signalColor}`}>{ind.signal}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-bloom-text-muted text-center">
        Computed from SoDEX OHLCV klines · {symbol}/USDC · {interval} timeframe
      </p>
    </motion.div>
  );
}

// ─── Sentiment tab ────────────────────────────────────────────────────────────

function SentimentPanel() {
  const [items, setItems]     = useState<SentimentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const fetchSentiment = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res  = await fetch("/api/market/sentiment");
      const json = await res.json();
      if (!res.ok) {
        setError(true);
        setItems([]);
        return;
      }
      const data: SentimentItem[] = Array.isArray(json?.data) ? json.data : [];
      setItems(data);
      if (data.length === 0 && json?.meta?.status !== "live") setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSentiment(); }, [fetchSentiment]);

  if (loading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-bloom-orange border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-bloom-text-muted">Loading sentiment...</span>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <AlertCircle size={20} className="text-bloom-text-muted mx-auto mb-2" />
        <p className="text-sm text-bloom-text-muted">
          {error ? "Sentiment data unavailable — API may be cold-starting" : "No sentiment data yet"}
        </p>
        <button onClick={fetchSentiment} className="orange-btn-outline text-xs px-4 py-1.5 mt-3">Retry</button>
      </div>
    );
  }

  const sentConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
    bullish: { color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/30", icon: TrendingUp },
    bearish: { color: "text-red-400",     bg: "bg-red-900/20 border-red-800/30",         icon: TrendingDown },
    neutral: { color: "text-bloom-text-muted", bg: "bg-white/5 border-bloom-border",     icon: Minus },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-bloom-text-muted">SoSoValue AI News Sentiment — {items.length} sources</p>
        <button onClick={fetchSentiment} className="p-1.5 rounded-lg hover:bg-white/5 text-bloom-text-muted">
          <RefreshCw size={12} />
        </button>
      </div>
      {items.map((item, i) => {
        const sent = item.sentiment?.toLowerCase() ?? "neutral";
        const cfg  = sentConfig[sent] ?? sentConfig.neutral;
        const Icon = cfg.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-card p-4"
          >
            <div className="flex items-start gap-3">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${cfg.bg} ${cfg.color}`}>
                <Icon size={9} />
                {sent.charAt(0).toUpperCase() + sent.slice(1)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-bloom-text leading-snug line-clamp-2">
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-bloom-orange transition-colors">
                      {item.title}
                    </a>
                  ) : item.title}
                </p>
                {item.source && (
                  <p className="text-[10px] text-bloom-text-muted mt-0.5">
                    {item.source} · {item.publishedAt ? timeAgo(item.publishedAt) : ""}
                  </p>
                )}
              </div>
              {item.score !== undefined && (
                <span className={`text-xs font-bold shrink-0 ${item.score > 0 ? "text-emerald-400" : item.score < 0 ? "text-red-400" : "text-bloom-text-muted"}`}>
                  {item.score > 0 ? "+" : ""}{(item.score * 100).toFixed(0)}
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [symbol, setSymbol]     = useState<ResearchSymbol>("BTC");
  const [interval, setChartInterval] = useState<ResearchInterval>("1h");
  const [tab, setTab]           = useState<TabId>("chart");
  const [aiRunning, setAiRunning] = useState(false);
  const [apiStatus, setApiStatus] = useState<PanelDataStatus>("unavailable");
  const [sosoStatus, setSosoStatus] = useState<PanelDataStatus>("unavailable");
  const [sodexStatus, setSodexStatus] = useState<PanelDataStatus>("unavailable");

  useEffect(() => {
    const probe = async () => {
      try {
        const [pricesRes, sentimentRes, klinesRes, orderbookRes] = await Promise.all([
          fetch("/api/market/prices"),
          fetch("/api/market/sentiment?limit=3"),
          fetch("/api/market/klines/BTC?interval=1h&limit=24"),
          fetch("/api/market/sodex/orderbook/vBTC_vUSDC"),
        ]);

        if (pricesRes.ok) {
          const j = await pricesRes.json();
          const source = j?.meta?.source as string | undefined;
          const st = j?.meta?.status as PanelDataStatus | undefined;
          const hasPrices = Array.isArray(j?.data) && j.data.length > 0;
          setApiStatus(
            source === "sodex" && hasPrices
              ? st === "stale" ? "stale" : "live"
              : source === "coingecko" && hasPrices
                ? "stale"
                : source === "seed"
                  ? "demo"
                  : hasPrices
                    ? "live"
                    : "unavailable",
          );
        } else {
          setApiStatus("unavailable");
        }

        if (sentimentRes.ok) {
          const j = await sentimentRes.json();
          const st = j?.meta?.status as PanelDataStatus | undefined;
          setSosoStatus(st === "live" ? "live" : st === "stale" ? "stale" : j?.data?.length ? "live" : "empty");
        } else {
          setSosoStatus("unavailable");
        }

        let sodexLive = false;
        if (klinesRes.ok) {
          const j = await klinesRes.json();
          if (Array.isArray(j?.data) && j.data.length > 0) {
            sodexLive = true;
          }
        }
        if (!sodexLive && orderbookRes.ok) {
          const j = await orderbookRes.json();
          const bids = j?.data?.bids ?? [];
          const asks = j?.data?.asks ?? [];
          if (bids.length > 0 || asks.length > 0) sodexLive = true;
        }
        setSodexStatus(sodexLive ? "live" : "offline");
      } catch {
        setApiStatus("unavailable");
        setSosoStatus("unavailable");
        setSodexStatus("unavailable");
      }
    };
    probe();
    const t = window.setInterval(probe, 30_000);
    return () => window.clearInterval(t);
  }, []);

  const handleAiAnalysis = useCallback(async () => {
    setAiRunning(true);
    setTab("signals");
    // The SignalsPanel will handle the actual trigger via its own state
    setTimeout(() => setAiRunning(false), 500);
  }, []);

  return (
    <div className="min-h-screen bg-bloom-bg">
      <Navbar />

      <main className="pt-24 pb-10 px-4 md:px-6 max-w-[1400px] mx-auto">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-bloom-text">Research</h1>
          <p className="text-sm text-bloom-text-muted mt-0.5">AI-powered technical analysis &amp; signals</p>
        </div>

        {/* ── Symbol · Interval · AI Analysis ───────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {/* Symbol buttons */}
          <div className="flex items-center gap-1 bg-bloom-bg-card border border-bloom-border rounded-xl px-2 py-1.5 flex-wrap">
            {SYMBOLS.map((s) => (
              <button
                key={s}
                onClick={() => setSymbol(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  symbol === s
                    ? "bg-bloom-orange text-black"
                    : "text-bloom-text-muted hover:text-bloom-text"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-bloom-border hidden md:block" />

          {/* Interval buttons */}
          <div className="flex items-center gap-1 bg-bloom-bg-card border border-bloom-border rounded-xl px-2 py-1.5">
            {INTERVALS.map((ivl) => (
              <button
                key={ivl.value}
                onClick={() => setChartInterval(ivl.value)}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                  interval === ivl.value
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-700/40"
                    : "text-bloom-text-muted hover:text-bloom-text"
                }`}
              >
                {ivl.label}
              </button>
            ))}
          </div>

          {/* AI Analysis button */}
          <button
            onClick={handleAiAnalysis}
            disabled={aiRunning}
            className="ml-auto orange-btn flex items-center gap-2 text-sm px-5 py-2"
          >
            {aiRunning ? (
              <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Cpu size={14} />
            )}
            AI Analysis
          </button>
        </div>

        {/* ── Tab bar ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-bloom-border mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                tab === t.id
                  ? "border-bloom-orange text-bloom-orange"
                  : "border-transparent text-bloom-text-muted hover:text-bloom-text"
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ───────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "chart" && (
              <PriceKlinesChart
                controlledSymbol={symbol}
                controlledInterval={interval}
                chartHeight={420}
              />
            )}
            {tab === "signals" && <SignalsPanel symbol={symbol} />}
            {tab === "orderbook" && <LiveOrderBook />}
            {tab === "confluence" && <ConfluencePanel symbol={symbol} interval={interval} />}
            {tab === "sentiment" && <SentimentPanel />}
            {tab === "institutional" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <InstitutionalDataPanel />
                <AlertsPanel />
              </div>
            )}
            {tab === "opportunities" && <OpportunityFeedPanel limit={12} />}
          </motion.div>
        </AnimatePresence>

        {/* ── Status bar ─────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 bg-bloom-bg/80 backdrop-blur-md border-t border-bloom-border px-6 py-2 flex items-center gap-4 text-[10px] text-bloom-text-muted z-30">
          {([
            { label: "API", status: apiStatus },
            { label: "SoSoValue", status: sosoStatus },
            { label: "SoDEX", status: sodexStatus },
          ] as const).map(({ label, status }) => {
            const isOk = status === "live" || status === "stale";
            return (
              <span key={label} className={`flex items-center gap-1.5 ${isOk ? "text-emerald-400" : status === "empty" ? "text-amber-400" : "text-red-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOk ? "bg-emerald-400" : status === "empty" ? "bg-amber-400" : "bg-red-400"}`} />
                {label} · {panelStatusLabel(status)}
              </span>
            );
          })}
          <span className="ml-auto text-bloom-text-muted">
            Updated {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </main>
    </div>
  );
}
