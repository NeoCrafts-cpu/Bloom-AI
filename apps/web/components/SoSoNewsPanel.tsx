"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, RefreshCw, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { NewsSentiment } from "@bloom-ai/types";

const API = "";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SENTIMENT_CONFIG = {
  bullish: { color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/30", icon: TrendingUp, label: "Bullish" },
  bearish: { color: "text-red-400",     bg: "bg-red-900/20 border-red-800/30",         icon: TrendingDown, label: "Bearish" },
  neutral: { color: "text-bloom-text-muted", bg: "bg-white/5 border-bloom-border",     icon: Minus, label: "Neutral" },
};

export default function SoSoNewsPanel() {
  const [news, setNews]         = useState<NewsSentiment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastUpdate, setLast]   = useState<Date | null>(null);
  const [isStale, setIsStale]   = useState(false);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/market/sentiment`);
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      if (data.length) {
        setNews(data);
        setIsStale(!!json?.meta?.isStale);
        setLast(new Date());
      }
    } catch {
      setIsStale(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const t = setInterval(fetchNews, 3 * 60 * 1000);
    return () => clearInterval(t);
  }, [fetchNews]);

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
            <Newspaper size={14} className="text-bloom-orange" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-bloom-text">Live Crypto News</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                isStale
                  ? "text-amber-400 bg-amber-900/20 border-amber-800/30"
                  : "text-emerald-400 bg-emerald-900/20 border-emerald-800/30"
              }`}>
                {isStale ? "Cached" : "Live"} · SoSoValue
              </span>
              {lastUpdate && (
                <span className="text-[10px] text-bloom-text-muted">
                  Updated {Math.floor((Date.now() - lastUpdate.getTime()) / 60000)}m ago
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {}
          <button
          onClick={fetchNews}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-white/5 text-bloom-text-muted hover:text-bloom-text transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
        </div>
      </div>

      {/* Sentiment summary */}
      {news.length > 0 && (
        <div className="flex gap-2 mb-4">
          {(["bullish", "bearish", "neutral"] as const).map((s) => {
            const count = news.filter((n) => n.sentiment === s).length;
            const cfg   = SENTIMENT_CONFIG[s];
            return (
              <div key={s} className={`flex-1 flex flex-col items-center py-2 rounded-lg border text-xs ${cfg.bg}`}>
                <cfg.icon size={12} className={`mb-0.5 ${cfg.color}`} />
                <span className={`font-bold ${cfg.color}`}>{count}</span>
                <span className="text-bloom-text-muted text-[10px]">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* News items */}
      <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
        {loading && news.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl shimmer" />
            ))}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {news.slice(0, 12).map((item, i) => {
              const cfg = SENTIMENT_CONFIG[item.sentiment];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i < 5 ? i * 0.05 : 0 }}
                  className="p-3 rounded-xl border border-bloom-border hover:border-bloom-border-hover hover:bg-white/3 transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <cfg.icon size={11} className={`${cfg.color} mt-0.5 shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-bloom-text leading-tight line-clamp-2">
                        {item.title || item.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-bloom-text-muted">{timeAgo(item.publishedAt)}</span>
                        <span className="text-[10px] text-bloom-text-muted">{item.source}</span>
                      </div>
                      {item.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[9px] bg-bloom-bg border border-bloom-border text-bloom-text-muted rounded px-1 py-0.5 font-mono">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {lastUpdate && (
        <p className="text-[10px] text-bloom-text-muted text-center mt-3">
          Updated {lastUpdate.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
