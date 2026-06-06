"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Ticker {
  symbol: string;
  price: string;
  change: number;
}

export default function MarketTicker() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const res = await fetch("/api/market/prices");
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : null;
        if (list && list.length > 0) {
          const source = data?.meta?.source as string | undefined;
          if (source === "seed") {
            setTickers([]);
            setIsStale(true);
            return;
          }
          setTickers(
            list.map((m: { symbol: string; price: number; change24h: number }) => ({
              symbol: m.symbol,
              price: (m.price ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
              change: m.change24h ?? 0,
            }))
          );
          setIsStale(!!data?.meta?.isStale);
        }
      } catch {
        // Retain last data if available, show stale indicator
        setIsStale(true);
      } finally {
        setLoading(false);
      }
    };
    fetchTickers();
    const interval = setInterval(fetchTickers, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="glass-card mb-6 py-3 px-4 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-bloom-orange animate-pulse" />
        <span className="text-xs text-bloom-text-muted">Loading market data...</span>
      </div>
    );
  }

  if (tickers.length === 0) return null;

  // Duplicate array for seamless scroll loop
  const doubled = [...tickers, ...tickers];

  return (
    <div className="glass-card mb-6 overflow-hidden py-3 px-4">
      {isStale && tickers.length === 0 && (
        <div className="text-[10px] text-amber-400 text-right mb-1">● Market data unavailable</div>
      )}
      {isStale && tickers.length > 0 && (
        <div className="text-[10px] text-amber-400 text-right mb-1">● Cached · Stale</div>
      )}
      <div className="relative overflow-hidden">
        <div
          ref={trackRef}
          className="flex gap-8 whitespace-nowrap"
          style={{
            animation: "tickerScroll 40s linear infinite",
          }}
        >
          {doubled.map((t, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-bloom-text">
                {t.symbol}
              </span>
              <span className="text-xs text-bloom-text-muted">${t.price}</span>
              <span
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  t.change >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {t.change >= 0 ? (
                  <TrendingUp size={10} />
                ) : (
                  <TrendingDown size={10} />
                )}
                {t.change >= 0 ? "+" : ""}
                {t.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
