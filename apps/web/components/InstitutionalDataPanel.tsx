"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Calendar, LineChart, Landmark } from "lucide-react";

type Tab = "macro" | "treasuries" | "stocks" | "indexes" | "charts";

export default function InstitutionalDataPanel({ className = "" }: { className?: string }) {
  const [tab, setTab] = useState<Tab>("macro");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

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
    try {
      const res = await fetch(endpoints[t]);
      const json = await res.json();
      setRows(Array.isArray(json?.data) ? json.data : []);
      setMessage(json?.meta?.message);
    } catch {
      setRows([]);
      setMessage("Unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

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
      {loading ? (
        <p className="text-xs text-bloom-text-muted py-8 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-bloom-text-muted py-8 text-center">{message ?? "No data"}</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {rows.slice(0, 20).map((row, i) => {
            const title = String(row.title ?? row.name ?? row.company ?? row.symbol ?? row.ticker ?? `Item ${i + 1}`);
            const sub = String(row.country ?? row.sector ?? row.symbol ?? row.description ?? row.category ?? "");
            return (
              <div key={i} className="border border-bloom-border rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-bloom-text">{title}</p>
                {sub && <p className="text-[10px] text-bloom-text-muted mt-0.5 line-clamp-2">{sub}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
