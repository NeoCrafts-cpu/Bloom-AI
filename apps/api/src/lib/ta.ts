export interface KlineBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TAMetrics {
  last: number;
  open: number;
  high: number;
  low: number;
  sma12: number;
  rsi14: number;
  pctChange: number;
  trend: "bullish" | "bearish" | "neutral";
  volumeTrend: "rising" | "falling" | "flat";
}

export function computeSMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

export function computeRSI(closes: number[], period = 14): number {
  if (closes.length < 2) return 50;
  let gains = 0;
  let losses = 0;
  const start = Math.max(1, closes.length - period);
  for (let i = start; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d;
    else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function computeTAMetrics(klines: KlineBar[]): TAMetrics | null {
  if (klines.length < 2) return null;
  const closes = klines.map((k) => k.close);
  const last = closes[closes.length - 1];
  const open = closes[0];
  const sma12 = computeSMA(closes, 12);
  const rsi14 = computeRSI(closes, 14);
  const pctChange = open > 0 ? ((last - open) / open) * 100 : 0;

  const mid = Math.floor(klines.length / 2);
  const volFirst = klines.slice(0, mid).reduce((s, k) => s + k.volume, 0);
  const volSecond = klines.slice(mid).reduce((s, k) => s + k.volume, 0);
  const volumeTrend =
    volSecond > volFirst * 1.1 ? "rising" : volSecond < volFirst * 0.9 ? "falling" : "flat";

  const trend: TAMetrics["trend"] =
    last > sma12 && rsi14 > 50 ? "bullish" : last < sma12 && rsi14 < 50 ? "bearish" : "neutral";

  return {
    last,
    open,
    high: Math.max(...klines.map((k) => k.high)),
    low: Math.min(...klines.map((k) => k.low)),
    sma12,
    rsi14,
    pctChange,
    trend,
    volumeTrend,
  };
}

export function taScore(metrics: TAMetrics | null): number {
  if (!metrics) return 0;
  let score = 0;
  if (metrics.trend === "bullish") score += 25;
  else if (metrics.trend === "bearish") score -= 15;
  if (metrics.rsi14 > 55 && metrics.rsi14 < 70) score += 15;
  else if (metrics.rsi14 < 45 && metrics.rsi14 > 30) score -= 10;
  if (metrics.pctChange > 2) score += 10;
  else if (metrics.pctChange < -2) score -= 10;
  if (metrics.volumeTrend === "rising") score += 5;
  return score;
}
