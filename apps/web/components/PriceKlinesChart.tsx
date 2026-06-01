"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart, CandlestickSeries, HistogramSeries,
  ColorType, CrosshairMode, type IChartApi,
  type ISeriesApi, type UTCTimestamp,
} from "lightweight-charts";
import { TrendingUp, TrendingDown, RefreshCw, ChevronDown } from "lucide-react";

interface KlineBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "AVAX"] as const;
type ChartSymbol = (typeof SYMBOLS)[number];
const INTERVALS = ["15m", "1h", "4h", "1d"] as const;
type ChartInterval = (typeof INTERVALS)[number];

const INTERVAL_LABEL: Record<ChartInterval, string> = {
  "15m": "15m", "1h": "1H", "4h": "4H", "1d": "1D",
};

export default function PriceKlinesChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef    = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [symbol, setSymbol]   = useState<ChartSymbol>("BTC");
  const [interval, setInterval] = useState<ChartInterval>("1h");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [lastCandle, setLastCandle] = useState<KlineBar | null>(null);
  const [showSymbols, setShowSymbols] = useState(false);

  // Init chart once (v5 API)
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:        "#10b981",
      downColor:      "#ef4444",
      borderUpColor:  "#10b981",
      borderDownColor:"#ef4444",
      wickUpColor:    "#10b981",
      wickDownColor:  "#ef4444",
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      color:       "#f97316",
      priceFormat: { type: "volume" as const },
      priceScaleId:"volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current       = chart;
    candleSeriesRef.current = candleSeries;
    volSeriesRef.current   = volSeries;

    return () => {
      chart.remove();
      chartRef.current        = null;
      candleSeriesRef.current = null;
      volSeriesRef.current    = null;
    };
  }, []);

  const fetchKlines = useCallback(async (sym: ChartSymbol, ivl: ChartInterval) => {
    setLoading(true);
    setError(false);
    try {
      const limit = ivl === "1d" ? 90 : ivl === "4h" ? 120 : 96;
      const res = await fetch(`/api/market/klines/${sym}?interval=${ivl}&limit=${limit}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      const bars: KlineBar[] = Array.isArray(json?.data) ? json.data : [];

      if (candleSeriesRef.current && volSeriesRef.current && bars.length > 0) {
        const candleData = bars.map((b) => ({
          time:  (Math.floor(b.time / 1000)) as UTCTimestamp,
          open:  b.open, high: b.high, low: b.low, close: b.close,
        }));
        const volData = bars.map((b) => ({
          time:  (Math.floor(b.time / 1000)) as UTCTimestamp,
          value: b.volume,
          color: b.close >= b.open ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)",
        }));

        candleSeriesRef.current.setData(candleData);
        volSeriesRef.current.setData(volData);
        chartRef.current?.timeScale().fitContent();
        setLastCandle(bars[bars.length - 1]);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKlines(symbol, interval); }, [symbol, interval, fetchKlines]);

  // Auto-refresh
  useEffect(() => {
    const ms = interval === "15m" ? 30_000 : interval === "1h" ? 60_000 : 120_000;
    const t = window.setInterval(() => fetchKlines(symbol, interval), ms);
    return () => window.clearInterval(t);
  }, [symbol, interval, fetchKlines]);

  const change = lastCandle
    ? ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100
    : 0;

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Symbol selector */}
          <div className="relative">
            <button
              onClick={() => setShowSymbols((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bloom-card-hover rounded-xl border border-bloom-border text-sm font-bold text-bloom-text hover:border-bloom-border-hover"
            >
              {symbol}
              <ChevronDown size={12} className={`transition-transform ${showSymbols ? "rotate-180" : ""}`} />
            </button>
            {showSymbols && (
              <div className="absolute top-full mt-1 left-0 bg-bloom-card border border-bloom-border rounded-xl overflow-hidden z-20 shadow-xl">
                {SYMBOLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSymbol(s); setShowSymbols(false); }}
                    className={`block w-full px-4 py-1.5 text-sm text-left hover:bg-bloom-card-hover ${s === symbol ? "text-bloom-orange" : "text-bloom-text"}`}
                  >
                    {s}/USDC
                  </button>
                ))}
              </div>
            )}
          </div>

          {lastCandle && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-bloom-text">
                ${lastCandle.close.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center gap-0.5 text-sm font-semibold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {change >= 0 ? "+" : ""}{change.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Interval buttons */}
          <div className="flex gap-1">
            {INTERVALS.map((ivl) => (
              <button
                key={ivl}
                onClick={() => setInterval(ivl)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  interval === ivl
                    ? "bg-bloom-orange text-black"
                    : "bg-bloom-card-hover text-bloom-text-muted hover:text-bloom-text"
                }`}
              >
                {INTERVAL_LABEL[ivl]}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchKlines(symbol, interval)}
            className="p-1.5 rounded-lg hover:bg-bloom-card-hover text-bloom-text-muted"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-bloom-text-muted mb-3">SoDEX Testnet · Real-time OHLCV</p>

      {/* Chart container */}
      <div className="relative">
        <div ref={containerRef} style={{ height: 280 }} />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
            <div className="w-5 h-5 border-2 border-bloom-orange border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-bloom-text-muted">Chart data unavailable</p>
            <p className="text-[10px] text-bloom-text-muted mt-1">Symbol may not be listed on SoDEX testnet</p>
          </div>
        )}
      </div>

      {/* OHLC stats */}
      {lastCandle && (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: "O", val: lastCandle.open },
            { label: "H", val: lastCandle.high },
            { label: "L", val: lastCandle.low },
            { label: "C", val: lastCandle.close },
          ].map(({ label, val }) => (
            <div key={label} className="bg-bloom-card-hover rounded-lg px-2 py-1.5 text-center">
              <p className="text-[9px] text-bloom-text-muted">{label}</p>
              <p className="text-xs font-semibold text-bloom-text">
                ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
