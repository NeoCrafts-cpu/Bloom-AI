"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Calendar, LineChart, Landmark, Copy, GitCompare } from "lucide-react";

type Tab = "macro" | "treasuries" | "stocks" | "indexes" | "charts";

interface SoSoIndexRow {
  id?: string;
  index_id?: string;
  name?: string;
  symbol?: string;
  description?: string;
}

export default function InstitutionalDataPanel({ className = "" }: { className?: string }) {
  const [tab, setTab] = useState<Tab>("macro");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [mirroring, setMirroring] = useState<string | null>(null);
  const [mirrorMsg, setMirrorMsg] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<{ id: string; name: string }[]>([]);
  const [compareStrategyId, setCompareStrategyId] = useState("");
  const [compareResult, setCompareResult] = useState<string | null>(null);

  const endpoints: Record<Tab, string> = {
    macro: "/api/market/macro",
    treasuries: "/api/market/btc-treasuries",
    stocks: "/api/market/crypto-stocks",
    indexes: "/api/market/indexes",
    charts: "/api/market/analysis-charts",
  };

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    setMessage(undefined);
    setMirrorMsg(null);
    setCompareResult(null);
    try {
      const res = await fetch(endpoints[t]);
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      // Normalize bare string tickers if API ever returns them raw
      setRows(
        data.map((row: unknown, i: number) =>
          typeof row === "string"
            ? { id: row, name: row.toUpperCase(), symbol: row }
            : (row as Record<string, unknown>) ?? { id: `row-${i}` },
        ),
      );
      setMessage(json?.meta?.message);
    } catch {
      setRows([]);
      setMessage("Unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  useEffect(() => {
    if (tab !== "indexes") return;
    fetch("/api/strategies")
      .then((r) => r.json())
      .then((j) => {
        const list = Array.isArray(j?.data) ? j.data : [];
        setStrategies(list.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
        if (list[0]?.id) setCompareStrategyId((c) => c || list[0].id);
      })
      .catch(() => {});
  }, [tab]);

  const indexIdOf = (row: Record<string, unknown>): string =>
    String(row.id ?? row.index_id ?? row.symbol ?? row.name ?? "");

  const mirrorIndex = async (row: SoSoIndexRow) => {
    const sosoIndexId = row.id ?? row.index_id ?? row.symbol;
    if (!sosoIndexId) return;
    setMirroring(String(sosoIndexId));
    setMirrorMsg(null);
    try {
      const res = await fetch("/api/strategies/from-soso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sosoIndexId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Mirror failed");
      const id = json?.data?.id as string;
      setMirrorMsg(`Mirrored → ${json?.data?.name ?? id}`);
    } catch (e) {
      setMirrorMsg((e as Error).message);
    } finally {
      setMirroring(null);
    }
  };

  const compareIndex = async (row: SoSoIndexRow) => {
    const sosoIndexId = row.id ?? row.index_id ?? row.symbol;
    if (!sosoIndexId || !compareStrategyId) return;
    setCompareResult(null);
    try {
      const res = await fetch("/api/strategies/compare-soso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sosoIndexId, strategyId: compareStrategyId, notionalUSD: 10000 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Compare failed");
      const diffs = (json?.data?.weightDiffs ?? [])
        .filter((d: { delta: number }) => Math.abs(d.delta) > 0.01)
        .slice(0, 4)
        .map(
          (d: { symbol: string; weightSoso: number; weightSsi: number }) =>
            `${d.symbol} ${(d.weightSoso * 100).toFixed(0)}%→${(d.weightSsi * 100).toFixed(0)}%`,
        )
        .join(" · ");
      setCompareResult(diffs || "Weights aligned within 1%");
    } catch (e) {
      setCompareResult((e as Error).message);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Calendar }[] = [
    { id: "macro", label: "Macro", icon: Calendar },
    { id: "treasuries", label: "Treasuries", icon: Landmark },
    { id: "stocks", label: "Stocks", icon: Building2 },
    { id: "indexes", label: "Indexes", icon: LineChart },
    { id: "charts", label: "Charts", icon: LineChart },
  ];

  return (
    <div className={`glass-card p-5 ${className}`}>
      <p className="text-xs font-semibold text-bloom-orange uppercase tracking-wider mb-3">
        SoSoValue Institutional
      </p>
      <div className="flex flex-wrap gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${
              tab === t.id
                ? "border-bloom-border-hover bg-bloom-orange-dim text-bloom-orange"
                : "border-bloom-border text-bloom-text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "indexes" && strategies.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] text-bloom-text-muted">Compare vs SSI</span>
          <select
            value={compareStrategyId}
            onChange={(e) => setCompareStrategyId(e.target.value)}
            className="flex-1 bg-bloom-bg border border-bloom-border rounded-lg px-2 py-1 text-[10px] text-bloom-text"
          >
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      {mirrorMsg && <p className="text-[10px] text-bloom-orange mb-2">{mirrorMsg}</p>}
      {compareResult && <p className="text-[10px] text-bloom-text-muted mb-2">{compareResult}</p>}
      {loading ? (
        <p className="text-xs text-bloom-text-muted py-8 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-bloom-text-muted py-8 text-center">{message ?? "No data"}</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {rows.slice(0, 20).map((row, i) => {
            const title = String(row.title ?? row.name ?? row.company ?? row.symbol ?? row.ticker ?? `Item ${i + 1}`);
            const sub = String(row.country ?? row.sector ?? row.symbol ?? row.description ?? row.category ?? "");
            const idx = indexIdOf(row);
            return (
              <div key={idx || i} className="border border-bloom-border rounded-xl px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-bloom-text">{title}</p>
                    {sub && sub !== title && (
                      <p className="text-[10px] text-bloom-text-muted mt-0.5 line-clamp-2">{sub}</p>
                    )}
                  </div>
                  {tab === "indexes" && idx && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => mirrorIndex(row as SoSoIndexRow)}
                        disabled={mirroring === idx}
                        className="text-[10px] px-2 py-0.5 rounded-lg border border-bloom-border-hover text-bloom-orange hover:bg-bloom-orange-dim disabled:opacity-50 flex items-center gap-1"
                      >
                        <Copy size={10} />
                        {mirroring === idx ? "…" : "Mirror"}
                      </button>
                      <button
                        type="button"
                        onClick={() => compareIndex(row as SoSoIndexRow)}
                        disabled={!compareStrategyId}
                        className="text-[10px] px-2 py-0.5 rounded-lg border border-bloom-border text-bloom-text-muted hover:text-bloom-text disabled:opacity-50 flex items-center gap-1"
                      >
                        <GitCompare size={10} />
                        Diff
                      </button>
                    </div>
                  )}
                </div>
                {tab === "indexes" && mirroring === null && mirrorMsg?.includes(title) && (
                  <Link href="/strategies" className="text-[10px] text-bloom-orange hover:underline mt-1 inline-block">
                    Open strategies →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
