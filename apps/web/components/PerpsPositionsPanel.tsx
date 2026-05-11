"use client";

import { useEffect, useState, useCallback } from "react";
import { Zap, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import { useAccount } from "wagmi";

interface PerpsPosition {
  symbol: string;
  positionSide: number;
  quantity: string;
  entryPrice: string;
  markPrice: string;
  unrealizedPnl: string;
  leverage: number;
  marginMode: string;
  liquidationPrice: string;
}

interface PerpsBalance {
  asset: string;
  available: string;
  total: string;
  marginBalance: string;
  unrealizedPnl: string;
}

interface PerpsState {
  accountID: number;
  balances: PerpsBalance[];
  positions: PerpsPosition[];
  openOrdersCount: number;
}

function fmt2(s: string | number) {
  const n = typeof s === "string" ? parseFloat(s) : s;
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PerpsPositionsPanel() {
  const { address, isConnected } = useAccount();
  const [state, setState]       = useState<PerpsState | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetchState = useCallback(async (addr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/market/perps/${addr}/state`);
      const json = await res.json();
      if (res.status === 404) {
        setState(null);
        setError("No perps account found for this address");
        return;
      }
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setState(json?.data ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!address) return;
    fetchState(address);
    const t = setInterval(() => fetchState(address), 30_000);
    return () => clearInterval(t);
  }, [address, fetchState]);

  if (!isConnected) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Zap size={14} className="text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-bloom-text">Perps Positions</h3>
            <p className="text-xs text-bloom-text-muted">SoDEX Perpetuals · Testnet</p>
          </div>
        </div>
        <div className="h-32 flex items-center justify-center text-xs text-bloom-text-muted">
          Connect wallet to view perps positions
        </div>
      </div>
    );
  }

  const positions = state?.positions ?? [];
  const usdc = state?.balances?.find((b) => b.asset === "vUSDC" || b.asset === "USDC");
  const totalPnl = positions.reduce((s, p) => s + parseFloat(p.unrealizedPnl || "0"), 0);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Zap size={14} className="text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-bloom-text">Perps Positions</h3>
            <p className="text-xs text-bloom-text-muted">SoDEX Perpetuals · Testnet</p>
          </div>
        </div>
        <button
          onClick={() => address && fetchState(address)}
          className="p-1.5 rounded-lg hover:bg-bloom-card-hover text-bloom-text-muted"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Balance bar */}
      {usdc && (
        <div className="bg-bloom-card-hover rounded-xl p-3 mb-4 grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-bloom-text-muted">Available</p>
            <p className="text-sm font-bold text-bloom-text">${fmt2(usdc.available)}</p>
          </div>
          <div>
            <p className="text-[10px] text-bloom-text-muted">Margin Bal</p>
            <p className="text-sm font-bold text-bloom-text">${fmt2(usdc.marginBalance)}</p>
          </div>
          <div>
            <p className="text-[10px] text-bloom-text-muted">Unrealized PnL</p>
            <p className={`text-sm font-bold ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalPnl >= 0 ? "+" : ""}${fmt2(totalPnl)}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-bloom-card-hover rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-6 justify-center text-xs text-bloom-text-muted">
          <AlertCircle size={14} />
          {error}
        </div>
      ) : positions.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-xs text-bloom-text-muted">
          No open perps positions
        </div>
      ) : (
        <div className="space-y-2">
          {positions.map((pos, i) => {
            const isLong = pos.positionSide === 1;
            const pnl    = parseFloat(pos.unrealizedPnl || "0");
            const entry  = parseFloat(pos.entryPrice || "0");
            const mark   = parseFloat(pos.markPrice || "0");
            const pctPnl = entry > 0 ? ((mark - entry) / entry) * 100 * (isLong ? 1 : -1) : 0;

            return (
              <div key={i} className="bg-bloom-card-hover rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      isLong ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                    }`}>
                      {isLong ? "LONG" : "SHORT"}
                    </span>
                    <span className="text-sm font-bold text-bloom-text">{pos.symbol}</span>
                    <span className="text-[10px] text-bloom-text-muted">{pos.leverage}x {pos.marginMode}</span>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {pnl >= 0 ? "+" : ""}${fmt2(pnl)}
                    </p>
                    <p className={`text-[10px] ${pctPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {pctPnl >= 0 ? "+" : ""}{pctPnl.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {[
                    { label: "Size", val: fmt2(pos.quantity) },
                    { label: "Entry", val: `$${fmt2(pos.entryPrice)}` },
                    { label: "Mark", val: `$${fmt2(pos.markPrice)}` },
                    { label: "Liq.", val: `$${fmt2(pos.liquidationPrice)}` },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-bloom-card rounded-lg px-1 py-1">
                      <p className="text-[9px] text-bloom-text-muted">{label}</p>
                      <p className="text-[10px] font-semibold text-bloom-text truncate">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {state && (
        <p className="text-[10px] text-bloom-text-muted mt-3 text-center">
          Account #{state.accountID} · {state.openOrdersCount} open orders
        </p>
      )}
    </div>
  );
}
