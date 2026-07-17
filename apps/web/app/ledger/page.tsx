"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, ExternalLink, RefreshCw, AlertCircle,
  CheckCircle, XCircle, Clock, FileText,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";
import type { VerifiedSignal, SignalOutcome, LedgerStats } from "@bloom-ai/types";

const SOURCE_LABELS: Record<string, string> = {
  journalist: "Journalist",
  chartanalyst: "Chart Analyst",
  strategist: "Strategist",
  discovery: "Discovery Engine",
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  open: { color: "text-sky-400 bg-sky-900/20 border-sky-800/30", icon: Clock },
  executed: { color: "text-emerald-400 bg-emerald-900/20 border-emerald-800/30", icon: CheckCircle },
  blocked: { color: "text-red-400 bg-red-900/20 border-red-800/30", icon: XCircle },
  expired: { color: "text-bloom-text-muted bg-white/5 border-bloom-border", icon: Clock },
  resolved: { color: "text-emerald-400 bg-emerald-900/20 border-emerald-800/30", icon: CheckCircle },
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function LedgerContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get("signal");

  const [signals, setSignals] = useState<VerifiedSignal[]>([]);
  const [selected, setSelected] = useState<VerifiedSignal | null>(null);
  const [outcome, setOutcome] = useState<SignalOutcome | null>(null);
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [sigRes, statsRes] = await Promise.all([
        fetch("/api/ledger/signals?limit=50"),
        fetch("/api/ledger/stats"),
      ]);
      if (!sigRes.ok) throw new Error("signals unavailable");
      const sigJson = await sigRes.json();
      const list: VerifiedSignal[] = Array.isArray(sigJson?.data) ? sigJson.data : [];
      setSignals(list);

      if (statsRes.ok) {
        const statsJson = await statsRes.json();
        setStats(statsJson?.data ?? null);
      }

      const target = highlightId
        ? list.find((s) => s.id === highlightId)
        : list[0];
      if (target) {
        setSelected(target);
        const detailRes = await fetch(`/api/ledger/signals/${target.id}`);
        if (detailRes.ok) {
          const detailJson = await detailRes.json();
          const outcomes = detailJson?.data?.outcomes;
          setOutcome(Array.isArray(outcomes) && outcomes.length > 0 ? outcomes[0] : null);
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [highlightId]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const selectSignal = async (signal: VerifiedSignal) => {
    setSelected(signal);
    setOutcome(null);
    try {
      const res = await fetch(`/api/ledger/signals/${signal.id}`);
      if (res.ok) {
        const json = await res.json();
        setOutcome(Array.isArray(json?.data?.outcomes) && json.data.outcomes.length > 0 ? json.data.outcomes[0] : null);
      }
    } catch {
      // non-critical
    }
  };

  return (
    <div className="min-h-screen bg-bloom-bg">
      <Navbar />
      <main className="pt-24 pb-10 px-4 md:px-6 max-w-[1400px] mx-auto">
        <PageHeader
          eyebrow="Proof layer"
          title={
            <>
              Verified Signal <span className="orange-gradient-text">Ledger</span>
            </>
          }
          subtitle="Full lifecycle: SoSoValue evidence → AI thesis → strategy → Sentinel → execution → outcome."
          actions={
            <button onClick={fetchLedger} className="orange-btn-outline flex items-center gap-2 text-xs px-4 py-2">
              <RefreshCw size={12} />
              Refresh
            </button>
          }
        />

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Total Signals", value: stats.totalSignals },
              { label: "Open", value: stats.openSignals },
              { label: "Executed", value: stats.executedSignals },
              { label: "Blocked", value: stats.blockedSignals },
              { label: "Resolved", value: stats.resolvedSignals },
            ].map((k) => (
              <div key={k.label} className="glass-card p-4 text-center">
                <p className="text-2xl font-bold text-bloom-text">{k.value}</p>
                <p className="text-[10px] text-bloom-text-muted uppercase tracking-wider">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="glass-card p-12 flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-bloom-orange border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-bloom-text-muted">Loading ledger…</span>
          </div>
        ) : error ? (
          <div className="glass-card p-8 text-center">
            <AlertCircle size={24} className="text-amber-400 mx-auto mb-3" />
            <p className="text-sm text-bloom-text-muted">Ledger unavailable — API may be cold-starting</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto">
              {signals.length === 0 ? (
                <div className="glass-card p-6 text-center text-sm text-bloom-text-muted">
                  No signals recorded yet. Run Journalist, Chart Analyst, or Discovery to populate.
                </div>
              ) : (
                signals.map((s) => {
                  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.open;
                  const StatusIcon = cfg.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectSignal(s)}
                      className={`w-full text-left glass-card p-4 transition-all hover:border-bloom-border-hover ${
                        selected?.id === s.id ? "border-bloom-border-hover shadow-orange-glow" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-bloom-orange">
                          {SOURCE_LABELS[s.source] ?? s.source}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}>
                          <StatusIcon size={9} />
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-bloom-text line-clamp-2">{s.title}</p>
                      <p className="text-[10px] text-bloom-text-muted mt-1">{timeAgo(s.publishedAt)}</p>
                    </button>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-2">
              {selected ? (
                <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="glass-card p-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs text-bloom-orange font-semibold mb-1">{SOURCE_LABELS[selected.source]}</p>
                        <h2 className="text-lg font-bold text-bloom-text">{selected.title}</h2>
                        <p className="text-sm text-bloom-text-muted mt-2 leading-relaxed">{selected.summary}</p>
                      </div>
                      {selected.score !== undefined && (
                        <span className="text-xl font-bold text-bloom-orange">{selected.score}</span>
                      )}
                    </div>

                    {selected.keyAssets.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {selected.keyAssets.map((a) => (
                          <span key={a} className="pill-badge text-xs">{a}</span>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-bloom-bg rounded-lg p-3 border border-bloom-border">
                        <p className="text-bloom-text-muted mb-1">Input Digest</p>
                        <code className="text-[10px] font-mono text-bloom-text break-all">{selected.inputDigest.slice(0, 24)}…</code>
                      </div>
                      <div className="bg-bloom-bg rounded-lg p-3 border border-bloom-border">
                        <p className="text-bloom-text-muted mb-1">Content Digest</p>
                        <code className="text-[10px] font-mono text-bloom-text break-all">{selected.contentDigest.slice(0, 24)}…</code>
                      </div>
                    </div>
                  </div>

                  {selected.evidence.length > 0 && (
                    <div className="glass-card p-5">
                      <h3 className="text-sm font-bold text-bloom-text mb-3 flex items-center gap-2">
                        <FileText size={14} className="text-bloom-orange" />
                        SoSoValue Evidence
                      </h3>
                      <div className="space-y-2">
                        {selected.evidence.map((ev, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-bloom-border/50 last:border-0">
                            <span className="text-bloom-text-muted">{ev.label}</span>
                            <span className="font-mono text-bloom-text">{String(ev.value)}</span>
                            <span className="text-[10px] text-bloom-text-muted uppercase">{ev.module}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-bloom-text mb-3">Lifecycle Links</h3>
                    <div className="flex flex-wrap gap-3">
                      {selected.strategyId && (
                        <Link href={`/strategies/${selected.strategyId}`} className="orange-btn-outline text-xs px-3 py-1.5 flex items-center gap-1">
                          Strategy <ExternalLink size={10} />
                        </Link>
                      )}
                      {selected.strategyId && selected.status !== "blocked" && (
                        <Link href={`/copy-trade?strategy=${selected.strategyId}&signal=${selected.id}`} className="orange-btn text-xs px-3 py-1.5 flex items-center gap-1">
                          <Zap size={10} /> Copy Trade
                        </Link>
                      )}
                      {selected.newsletterId && (
                        <Link href="/terminal" className="orange-btn-outline text-xs px-3 py-1.5">Newsletter</Link>
                      )}
                    </div>
                  </div>

                  {outcome && (
                    <div className="glass-card p-5 border-emerald-800/20">
                      <h3 className="text-sm font-bold text-bloom-text mb-3">Outcome</h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-bloom-text-muted">Execution Mode</p>
                          <p className={`font-bold ${outcome.verification.executionMode === "simulated" ? "text-amber-400" : "text-emerald-400"}`}>
                            {outcome.verification.executionMode === "simulated" ? "SIMULATED" : "LIVE"}
                          </p>
                        </div>
                        <div>
                          <p className="text-bloom-text-muted">Sentinel</p>
                          <p className={outcome.verification.sentinelPassed ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                            {outcome.verification.sentinelPassed ? "PASSED" : "BLOCKED"}
                          </p>
                        </div>
                        {outcome.pnlUSD !== undefined && (
                          <div>
                            <p className="text-bloom-text-muted">PnL (USD)</p>
                            <p className={`font-bold ${(outcome.pnlUSD ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              ${outcome.pnlUSD?.toFixed(2) ?? "pending mark-to-market"}
                            </p>
                          </div>
                        )}
                        {outcome.entryNotionalUSD > 0 && (
                          <div>
                            <p className="text-bloom-text-muted">Entry Notional</p>
                            <p className="font-bold text-bloom-text">${outcome.entryNotionalUSD.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!outcome && selected.status === "open" && (
                    <div className="glass-card p-4 text-xs text-bloom-text-muted text-center">
                      Outcome pending — signal is open with no execution yet
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="glass-card p-12 text-center text-bloom-text-muted text-sm">
                  Select a signal to inspect its full provenance chain
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function LedgerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bloom-bg" />}>
      <LedgerContent />
    </Suspense>
  );
}
