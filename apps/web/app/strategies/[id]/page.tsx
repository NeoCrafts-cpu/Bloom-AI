"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Layers, RefreshCw, ArrowUpRight, GitCompare, History,
  AlertCircle, Zap, ExternalLink,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import type { SSIIndex, SSIRebalanceEvent, IndexComparison } from "@bloom-ai/types";

function StrategyDetailContent() {
  const params = useParams();
  const id = params?.id as string;

  const [strategy, setStrategy] = useState<SSIIndex | null>(null);
  const [strategies, setStrategies] = useState<SSIIndex[]>([]);
  const [history, setHistory] = useState<SSIRebalanceEvent[]>([]);
  const [tradability, setTradability] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [compareId, setCompareId] = useState("");
  const [comparison, setComparison] = useState<IndexComparison | null>(null);
  const [rebalanceReason, setRebalanceReason] = useState("");
  const [rebalancing, setRebalancing] = useState(false);
  const [rebalanceMsg, setRebalanceMsg] = useState<string | null>(null);

  const fetchStrategy = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/strategies/${id}`);
      if (!res.ok) throw new Error("not found");
      const json = await res.json();
      setStrategy(json?.data?.strategy ?? null);
      setHistory(Array.isArray(json?.data?.history) ? json.data.history : []);
      setTradability(json?.data?.tradability ?? {});
      const listRes = await fetch("/api/strategies");
      if (listRes.ok) {
        const listJson = await listRes.json();
        const list = Array.isArray(listJson?.data) ? listJson.data : [];
        setStrategies(list);
        const firstOther = list.find((s: SSIIndex) => s.id !== id);
        setCompareId((current) => current || firstOther?.id || "");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStrategy(); }, [fetchStrategy]);

  const runCompare = async () => {
    if (!compareId) return;
    try {
      const res = await fetch("/api/strategies/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idA: id, idB: compareId, notionalUSD: 10000 }),
      });
      if (res.ok) {
        const json = await res.json();
        setComparison(json?.data ?? null);
      }
    } catch {
      // ignore
    }
  };

  const proposeRebalance = async () => {
    if (!strategy || !rebalanceReason.trim()) return;
    setRebalancing(true);
    setRebalanceMsg(null);
    try {
      const res = await fetch(`/api/strategies/${id}/rebalance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: strategy.assets,
          reason: rebalanceReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Rebalance failed");
      setRebalanceMsg("Rebalance recorded");
      fetchStrategy();
    } catch (e) {
      setRebalanceMsg((e as Error).message);
    } finally {
      setRebalancing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bloom-bg">
        <Navbar />
        <div className="pt-32 flex justify-center">
          <div className="w-6 h-6 border-2 border-bloom-orange border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !strategy) {
    return (
      <div className="min-h-screen bg-bloom-bg">
        <Navbar />
        <div className="pt-32 text-center">
          <AlertCircle size={24} className="text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-bloom-text-muted">Strategy not found</p>
          <Link href="/strategies" className="orange-btn-outline text-xs px-4 py-2 mt-4 inline-block">Back</Link>
        </div>
      </div>
    );
  }

  const nonTradable = strategy.assets.filter((a) => tradability[a.symbol] === false);

  return (
    <div className="min-h-screen bg-bloom-bg">
      <Navbar />
      <main className="pt-24 pb-10 px-4 md:px-6 max-w-[1200px] mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers size={14} className="text-bloom-orange" />
              <code className="text-xs font-mono text-bloom-orange">{strategy.symbol}</code>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-bloom-border text-bloom-text-muted uppercase">
                {strategy.status ?? "published"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-bloom-text">{strategy.name}</h1>
            <p className="text-sm text-bloom-text-muted mt-1 max-w-2xl">{strategy.description}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/strategies/studio?edit=${id}`} className="orange-btn-outline text-xs px-3 py-2 flex items-center gap-1">
              Edit in Studio
            </Link>
            <Link href={`/copy-trade?strategy=${id}`} className="orange-btn text-xs px-3 py-2 flex items-center gap-1">
              <Zap size={12} /> Copy Trade
            </Link>
          </div>
        </div>

        {nonTradable.length > 0 && (
          <div className="glass-card border-amber-800/30 p-3 mb-5 text-xs text-amber-400 flex items-center gap-2">
            <AlertCircle size={14} />
            {nonTradable.map((a) => a.symbol).join(", ")} not tradable on SoDEX — copy-trade may be blocked
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="glass-card p-5">
              <h2 className="text-sm font-bold text-bloom-text mb-4">Composition</h2>
              <div className="space-y-3">
                {strategy.assets.map((asset) => (
                  <div key={asset.symbol} className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-bloom-text w-14">{asset.symbol}</span>
                    <div className="flex-1 h-2 bg-bloom-bg rounded-full overflow-hidden">
                      <div className="h-full bg-bloom-orange rounded-full" style={{ width: `${asset.weight * 100}%` }} />
                    </div>
                    <span className="text-sm font-mono text-bloom-text-muted w-16 text-right">
                      {(asset.weight * 100).toFixed(1)}%
                    </span>
                    {asset.currentPrice > 0 && (
                      <span className="text-xs text-bloom-text-muted w-24 text-right">
                        ${asset.currentPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-bloom-border text-xs text-bloom-text-muted">
                <span>TVL: ${(strategy.tvl / 1e6).toFixed(2)}M</span>
                <span>v{strategy.version ?? 1}</span>
                {strategy.rebalancedAt && <span>Rebalanced {new Date(strategy.rebalancedAt).toLocaleDateString()}</span>}
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="text-sm font-bold text-bloom-text mb-3 flex items-center gap-2">
                <History size={14} className="text-bloom-orange" />
                Rebalance History
              </h2>
              {history.length === 0 ? (
                <p className="text-xs text-bloom-text-muted">No rebalance events yet</p>
              ) : (
                <div className="space-y-3">
                  {history.slice().reverse().map((ev) => (
                    <div key={ev.id} className="border border-bloom-border rounded-xl p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-bloom-text">{ev.reason}</span>
                        <span className="text-bloom-text-muted">{new Date(ev.timestamp).toLocaleString()}</span>
                      </div>
                      {ev.signalId && (
                        <Link href={`/ledger?signal=${ev.signalId}`} className="text-bloom-orange hover:underline flex items-center gap-1">
                          Signal proof <ExternalLink size={9} />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="glass-card p-5">
              <h2 className="text-sm font-bold text-bloom-text mb-3 flex items-center gap-2">
                <GitCompare size={14} className="text-bloom-orange" />
                Compare
              </h2>
              <select
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
                className="w-full bg-bloom-bg border border-bloom-border rounded-xl px-3 py-2 text-xs text-bloom-text mb-3"
              >
                <option value="">Select another strategy</option>
                {strategies.filter((s) => s.id !== id).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button onClick={runCompare} disabled={!compareId} className="orange-btn-outline text-xs w-full py-2 flex items-center justify-center gap-1 disabled:opacity-50">
                Compare @ $10k
              </button>
              {comparison && (
                <div className="mt-3 text-xs space-y-1">
                  <p className="text-bloom-text-muted">
                    Notional A: ${comparison.impliedNotionalA.toLocaleString()} · B: ${comparison.impliedNotionalB.toLocaleString()}
                  </p>
                  {comparison.weightDiffs.filter((d) => Math.abs(d.delta) > 0.01).slice(0, 5).map((d) => (
                    <p key={d.symbol} className="text-bloom-text-muted">
                      {d.symbol}: {(d.weightA * 100).toFixed(0)}% → {(d.weightB * 100).toFixed(0)}% ({d.delta >= 0 ? "+" : ""}{(d.delta * 100).toFixed(1)}%)
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-5">
              <h2 className="text-sm font-bold text-bloom-text mb-3">Propose Rebalance</h2>
              <textarea
                value={rebalanceReason}
                onChange={(e) => setRebalanceReason(e.target.value)}
                placeholder="Reason for rebalance…"
                rows={3}
                className="w-full bg-bloom-bg border border-bloom-border rounded-xl px-3 py-2 text-xs text-bloom-text mb-3 resize-none"
              />
              <button
                onClick={proposeRebalance}
                disabled={rebalancing || !rebalanceReason.trim()}
                className="orange-btn text-xs w-full py-2 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <RefreshCw size={12} className={rebalancing ? "animate-spin" : ""} />
                Record Rebalance
              </button>
              {rebalanceMsg && <p className="text-xs text-bloom-text-muted mt-2">{rebalanceMsg}</p>}
              <Link href={`/strategies/studio?edit=${id}`} className="text-xs text-bloom-orange hover:underline mt-3 flex items-center gap-1">
                Edit weights in Studio <ArrowUpRight size={10} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function StrategyDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bloom-bg" />}>
      <StrategyDetailContent />
    </Suspense>
  );
}
