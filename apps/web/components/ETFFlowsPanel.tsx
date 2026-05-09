"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, RefreshCw, BarChart3, Activity } from "lucide-react";
import type { ETFFlowData } from "@bloom-ai/types";

const API = "/api";

export default function ETFFlowsPanel() {
  const [flows, setFlows]       = useState<ETFFlowData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError]       = useState(false);
  const [isStale, setIsStale]   = useState(false);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res  = await fetch(`${API}/api/market/etf-flows`);
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setFlows(data);
      setIsStale(!!json?.meta?.isStale);
      setLastUpdate(new Date());
    } catch {
      setError(true);
      setIsStale(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
    // Refresh every 5 minutes (SoSoValue rate limits)
    const interval = setInterval(fetchFlows, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchFlows]);

  const totalInflow = flows.reduce((sum, f) => sum + f.netInflow, 0);
  const bullish     = flows.filter((f) => f.netInflow > 0).length;

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
            <BarChart3 size={14} className="text-bloom-orange" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-bloom-text">ETF Fund Flows</h3>
            <p className="text-xs text-bloom-text-muted">Powered by SoSoValue Terminal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isStale && (
            <span className="text-[10px] text-amber-400 font-medium">● Cached</span>
          )}
          <button
          onClick={fetchFlows}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-white/5 text-bloom-text-muted hover:text-bloom-text transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
        </div>
      </div>

      {/* Summary bar */}
      {!loading && flows.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-bloom-bg rounded-xl p-3 border border-bloom-border text-center">
            <p className="text-xs text-bloom-text-muted mb-0.5">Total Net Flow</p>
            <p className={`text-sm font-bold ${totalInflow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalInflow >= 0 ? "+" : ""}${(totalInflow / 1e6).toFixed(1)}M
            </p>
          </div>
          <div className="bg-bloom-bg rounded-xl p-3 border border-bloom-border text-center">
            <p className="text-xs text-bloom-text-muted mb-0.5">Inflows</p>
            <p className="text-sm font-bold text-emerald-400">{bullish}</p>
          </div>
          <div className="bg-bloom-bg rounded-xl p-3 border border-bloom-border text-center">
            <p className="text-xs text-bloom-text-muted mb-0.5">Outflows</p>
            <p className="text-sm font-bold text-red-400">{flows.length - bullish}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="shimmer h-12 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-6 text-bloom-text-muted text-sm">
          <Activity size={20} className="mx-auto mb-2 opacity-40" />
          Unable to fetch ETF flows. Using cached data.
        </div>
      )}

      {/* Flow rows */}
      {!loading && flows.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {flows.map((flow, i) => {
              const isPositive = flow.netInflow >= 0;
              const barWidth   = Math.min(
                100,
                Math.abs(flow.netInflow) / Math.max(...flows.map((f) => Math.abs(f.netInflow))) * 100,
              );

              return (
                <motion.div
                  key={flow.ticker}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative rounded-xl overflow-hidden bg-bloom-bg border border-bloom-border hover:border-bloom-border-hover transition-colors p-3"
                >
                  {/* Background fill bar */}
                  <div
                    className={`absolute left-0 top-0 h-full transition-all duration-700 ${
                      isPositive ? "bg-emerald-900/15" : "bg-red-900/15"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isPositive ? (
                        <TrendingUp size={13} className="text-emerald-400" />
                      ) : (
                        <TrendingDown size={13} className="text-red-400" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-bloom-text">{flow.ticker}</p>
                        <p className="text-xs text-bloom-text-muted">
                          AUM ${(flow.totalAUM / 1e9).toFixed(1)}B
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {isPositive ? "+" : ""}${(flow.netInflow / 1e6).toFixed(0)}M
                      </p>
                      <p className={`text-xs ${flow.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {flow.change24h >= 0 ? "+" : ""}{flow.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Last update */}
      {lastUpdate && (
        <p className="text-xs text-bloom-text-muted mt-3 text-right">
          Updated {lastUpdate.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
