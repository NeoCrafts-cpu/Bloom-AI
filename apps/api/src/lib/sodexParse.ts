/** Parse SoDEX REST responses (supports legacy + current field names). */

export interface SodexKlineBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type RawTicker = {
  symbol: string;
  lastPrice?: string;
  lastPx?: string;
  priceChangePercent?: string;
  changePct?: number;
  volume?: string;
  quoteVolume?: string;
  q?: string;
};

export function parseSodexTickerPrice(ticker: RawTicker): number {
  const raw = ticker.lastPrice ?? ticker.lastPx ?? "0";
  const price = parseFloat(String(raw));
  return Number.isFinite(price) && price > 0 ? price : 0;
}

export function parseSodexTickerChangePct(ticker: RawTicker): number {
  if (ticker.priceChangePercent != null) {
    const v = parseFloat(String(ticker.priceChangePercent));
    if (Number.isFinite(v)) return v;
  }
  if (typeof ticker.changePct === "number" && Number.isFinite(ticker.changePct)) {
    return ticker.changePct;
  }
  return 0;
}

export function parseSodexTickerVolume(ticker: RawTicker): number {
  const raw = ticker.quoteVolume ?? ticker.q ?? ticker.volume ?? "0";
  const v = parseFloat(String(raw));
  return Number.isFinite(v) ? v : 0;
}

export function parseSodexKlines(data: unknown): SodexKlineBar[] {
  if (!Array.isArray(data) || data.length === 0) return [];

  const bars: SodexKlineBar[] = [];

  for (const row of data) {
    if (Array.isArray(row)) {
      const [t, o, h, l, c, v] = row;
      bars.push({
        time: normalizeKlineTime(Number(t)),
        open: parseFloat(String(o)),
        high: parseFloat(String(h)),
        low: parseFloat(String(l)),
        close: parseFloat(String(c)),
        volume: parseFloat(String(v ?? 0)),
      });
      continue;
    }

    if (row && typeof row === "object") {
      const o = row as Record<string, unknown>;
      const time = normalizeKlineTime(Number(o.t ?? o.time ?? 0));
      const open = parseFloat(String(o.o ?? o.open ?? 0));
      const high = parseFloat(String(o.h ?? o.high ?? 0));
      const low = parseFloat(String(o.l ?? o.low ?? 0));
      const close = parseFloat(String(o.c ?? o.close ?? 0));
      const volume = parseFloat(String(o.v ?? o.volume ?? o.q ?? 0));
      if (time > 0 && close > 0) {
        bars.push({ time, open, high, low, close, volume });
      }
    }
  }

  return bars.filter((b) => b.time > 0 && b.close > 0);
}

/** SoDEX may return unix seconds or milliseconds. */
function normalizeKlineTime(t: number): number {
  if (!Number.isFinite(t) || t <= 0) return 0;
  return t < 1e12 ? t * 1000 : t;
}
