"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Layers, RefreshCw, ExternalLink } from "lucide-react";

interface Protocol {
  name: string;
  tvl: number;
  change24h: number;
  logo?: string;
  category?: string;
}

function fmtTVL(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

function getBarWidth(tvl: number, max: number) {
  return max > 0 ? Math.max(4, (tvl / max) * 100) : 4;
}

export default function DefiTVLPanel() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchTVL = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/market/defi-tvl");
      const json = await res.json();
      const list: Protocol[] = Array.isArray(json?.data) ? json.data : [];
      setProtocols(list);
      setLastUpdate(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTVL();
    const t = setInterval(fetchTVL, 15 * 60 * 1000);
    return () => clearInterval(t);
  }, [fetchTVL]);

  const totalTVL = protocols.reduce((s, p) => s + p.tvl, 0);
  const maxTVL   = protocols[0]?.tvl ?? 1;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Layers size={14} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-bloom-text">DeFi TVL</h3>
            <p className="text-xs text-bloom-text-muted">Top protocols · DefiLlama</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[10px] text-bloom-text-muted">
              {lastUpdate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchTVL}
            className="p-1.5 rounded-lg hover:bg-bloom-card-hover text-bloom-text-muted"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Total TVL */}
      {!loading && protocols.length > 0 && (
        <div className="bg-bloom-card-hover rounded-xl p-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-bloom-text-muted uppercase tracking-wide">Total DeFi TVL</p>
            <p className="text-xl font-bold text-bloom-text mt-0.5">{fmtTVL(totalTVL)}</p>
          </div>
          <p className="text-xs text-bloom-text-muted">Top {protocols.length} protocols</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-bloom-card-hover rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-xs text-bloom-text-muted">
          Failed to load DeFi TVL
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 bloom-scroll">
          {protocols.map((p, i) => (
            <div key={p.name} className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-bloom-card-hover transition-colors">
              {/* Rank */}
              <span className="text-[10px] text-bloom-text-muted w-4 text-center font-mono">{i + 1}</span>

              {/* Logo */}
              {p.logo ? (
                <img src={p.logo} alt={p.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-bloom-card flex-shrink-0 flex items-center justify-center">
                  <span className="text-[8px] text-bloom-text-muted font-bold">{p.name[0]}</span>
                </div>
              )}

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-bloom-text truncate">{p.name}</span>
                  {p.category && (
                    <span className="text-[9px] text-bloom-text-muted ml-1 flex-shrink-0">{p.category}</span>
                  )}
                </div>
                <div className="h-1 bg-bloom-card rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500/60"
                    style={{ width: `${getBarWidth(p.tvl, maxTVL)}%` }}
                  />
                </div>
              </div>

              {/* TVL + change */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-bloom-text">{fmtTVL(p.tvl)}</p>
                <p className={`text-[10px] font-medium flex items-center justify-end gap-0.5 ${
                  p.change24h >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {p.change24h >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {p.change24h >= 0 ? "+" : ""}{(p.change24h ?? 0).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
