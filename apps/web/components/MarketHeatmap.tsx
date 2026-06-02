"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutGrid, RefreshCw } from "lucide-react";
import {
  Treemap, ResponsiveContainer, Tooltip,
} from "recharts";

interface HeatmapCoin {
  symbol: string;
  marketCap: number;
  change24h: number;
  price: number;
}

function getColor(change: number): string {
  if (change >  8) return "#059669";
  if (change >  4) return "#10b981";
  if (change >  1) return "#34d399";
  if (change > -1) return "#6b7280";
  if (change > -4) return "#f87171";
  if (change > -8) return "#ef4444";
  return "#dc2626";
}

function fmtChange(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

interface TreeNode { name: string; size: number; change: number; price: number }

const CustomContent = (props: {
  x?: number; y?: number; width?: number; height?: number;
  name?: string; change?: number; price?: number;
}) => {
  const { x = 0, y = 0, width = 0, height = 0, name = "", change = 0, price = 0 } = props;
  const bg = getColor(change);
  const textFits = width > 40 && height > 30;
  return (
    <g>
      <rect
        x={x + 1} y={y + 1}
        width={width - 2} height={height - 2}
        fill={bg}
        fillOpacity={0.85}
        rx={4}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={1}
      />
      {textFits && (
        <>
          <text x={x + width / 2} y={y + height / 2 - (height > 50 ? 6 : 0)}
            textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.95)" fontSize={Math.min(13, width / 4)} fontWeight="bold">
            {name}
          </text>
          {height > 48 && (
            <text x={x + width / 2} y={y + height / 2 + 12}
              textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.7)" fontSize={Math.min(10, width / 5)}>
              {fmtChange(change)}
            </text>
          )}
        </>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload?: TreeNode }[] }) => {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-card px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-bloom-text">{d.name}</p>
      <p className="text-bloom-text-muted">Price: ${d.price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p className={d.change >= 0 ? "text-emerald-400" : "text-red-400"}>24h: {fmtChange(d.change)}</p>
      <p className="text-bloom-text-muted">
        MCap: ${(d.size / 1e9).toFixed(2)}B
      </p>
    </div>
  );
};

export default function MarketHeatmap() {
  const [coins, setCoins]       = useState<HeatmapCoin[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchHeatmap = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res  = await fetch("/api/market/heatmap");
      const json = await res.json();
      if (!res.ok) throw new Error("bad response");
      const list: HeatmapCoin[] = Array.isArray(json?.data) ? json.data : [];
      setCoins(list.filter((c) => c.marketCap > 0));
      setLastUpdate(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHeatmap();
    const t = setInterval(fetchHeatmap, 5 * 60_000);
    return () => clearInterval(t);
  }, [fetchHeatmap]);

  const treeData: TreeNode[] = coins.map((c) => ({
    name: c.symbol,
    size: c.marketCap,
    change: c.change24h,
    price: c.price,
  }));

  const gainers = [...coins].sort((a, b) => b.change24h - a.change24h).slice(0, 3);
  const losers  = [...coins].sort((a, b) => a.change24h - b.change24h).slice(0, 3);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <LayoutGrid size={14} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-bloom-text">Market Heatmap</h3>
            <p className="text-xs text-bloom-text-muted">Size = Market Cap · Color = 24h Change</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[10px] text-bloom-text-muted">
              {lastUpdate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button onClick={fetchHeatmap} className="p-1.5 rounded-lg hover:bg-bloom-card-hover text-bloom-text-muted">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-56 bg-bloom-card-hover rounded-xl animate-pulse" />
      ) : error ? (
        <div className="h-56 flex items-center justify-center text-xs text-bloom-text-muted">Failed to load heatmap</div>
      ) : treeData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs text-bloom-text-muted">No market data</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <Treemap
            data={treeData}
            dataKey="size"
            content={<CustomContent />}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      )}

      {/* Gainers / Losers legend */}
      {coins.length > 0 && !loading && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <p className="text-[9px] text-emerald-400 font-semibold uppercase mb-1.5">Top Gainers</p>
            {gainers.map((c) => (
              <div key={c.symbol} className="flex justify-between items-center py-0.5">
                <span className="text-[10px] text-bloom-text font-medium">{c.symbol}</span>
                <span className="text-[10px] text-emerald-400">+{(c.change24h ?? 0).toFixed(2)}%</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[9px] text-red-400 font-semibold uppercase mb-1.5">Top Losers</p>
            {losers.map((c) => (
              <div key={c.symbol} className="flex justify-between items-center py-0.5">
                <span className="text-[10px] text-bloom-text font-medium">{c.symbol}</span>
                <span className="text-[10px] text-red-400">{(c.change24h ?? 0).toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color legend */}
      <div className="mt-3 flex items-center gap-1">
        {[[-10,"#dc2626"],[-5,"#ef4444"],[0,"#6b7280"],[5,"#10b981"],[10,"#059669"]].map(([label, color]) => (
          <div key={String(label)} className="flex items-center gap-0.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: String(color) }} />
            <span className="text-[8px] text-bloom-text-muted">{label}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
