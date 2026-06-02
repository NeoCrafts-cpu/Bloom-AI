"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Calendar, RefreshCw } from "lucide-react";

interface HistoryDay {
  date: string;
  total_net_inflow: number;
  total_net_assets: number;
  cum_net_inflow: number;
}

function fmtM(n: number) {
  const v = n ?? 0;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toFixed(0)}`;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-bloom-card border border-bloom-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-bloom-text-muted mb-1">{label}</p>
      <p className={val >= 0 ? "text-emerald-400" : "text-red-400"}>
        {val >= 0 ? "+" : ""}{fmtM(val)} inflow
      </p>
    </div>
  );
};

export default function ETFHistoryChart({ symbol = "BTC" }: { symbol?: "BTC" | "ETH" }) {
  const [data, setData] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState<"BTC" | "ETH">(symbol);

  const fetchHistory = useCallback(async (sym: "BTC" | "ETH") => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/market/etf-history?symbol=${sym}&limit=30`);
      const json = await res.json();
      const list: HistoryDay[] = Array.isArray(json?.data) ? json.data : [];
      // API returns descending; reverse for chart
      setData([...list].reverse());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(activeSymbol); }, [activeSymbol, fetchHistory]);

  const totalCumulative = data.length ? (data[data.length - 1]?.cum_net_inflow ?? 0) : 0;
  const last7days = data.slice(-7).reduce((s, d) => s + (d.total_net_inflow ?? 0), 0);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
            <Calendar size={14} className="text-bloom-orange" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-bloom-text">ETF Flow History</h3>
            <p className="text-xs text-bloom-text-muted">30-day daily net inflows · SoSoValue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["BTC", "ETH"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSymbol(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeSymbol === s
                  ? "bg-bloom-orange text-black"
                  : "bg-bloom-card-hover text-bloom-text-muted hover:text-bloom-text"
              }`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => fetchHistory(activeSymbol)}
            className="p-1.5 rounded-lg hover:bg-bloom-card-hover text-bloom-text-muted"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-bloom-card-hover rounded-xl p-3">
          <p className="text-[10px] text-bloom-text-muted uppercase tracking-wide mb-1">7d Net Flow</p>
          <p className={`text-base font-bold ${last7days >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {last7days >= 0 ? <TrendingUp size={12} className="inline mr-1" /> : <TrendingDown size={12} className="inline mr-1" />}
            {last7days >= 0 ? "+" : ""}{fmtM(last7days)}
          </p>
        </div>
        <div className="bg-bloom-card-hover rounded-xl p-3">
          <p className="text-[10px] text-bloom-text-muted uppercase tracking-wide mb-1">Cum. Inflow</p>
          <p className={`text-base font-bold ${totalCumulative >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalCumulative >= 0 ? "+" : ""}{fmtM(totalCumulative)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-bloom-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-xs text-bloom-text-muted">
          Failed to load ETF history
        </div>
      ) : data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-bloom-text-muted">
          No history data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fill: "#9ca3af", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => fmtM(v)}
              tick={{ fill: "#9ca3af", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <Bar dataKey="total_net_inflow" radius={[2, 2, 0, 0]} maxBarSize={16}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.total_net_inflow >= 0 ? "#10b981" : "#ef4444"}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
