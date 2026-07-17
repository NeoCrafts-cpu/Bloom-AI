/** Parse SoDEX REST responses (supports legacy + current field names). */

export interface SodexKlineBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NormalizedSodexSymbol {
  symbol: string;
  symbolID: number;
  baseAsset: string;
  quoteAsset: string;
  minNotional: string;
  pricePrecision: number;
  quantityPrecision: number;
  tickSize: string;
  stepSize: string;
  minQuantity: string;
  lastTradePrice: string;
  status?: string;
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

/**
 * Normalize spot/perps symbol rows.
 * Current SoDEX: { id, name, baseCoin, quoteCoin, ... }
 * Legacy: { symbolID, symbol, baseAsset, quoteAsset, ... }
 */
export function normalizeSodexSymbols(data: unknown): NormalizedSodexSymbol[] {
  if (!Array.isArray(data)) return [];
  const out: NormalizedSodexSymbol[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const symbolID = Number(r.symbolID ?? r.id ?? 0);
    const symbol = String(r.symbol ?? r.name ?? "");
    const baseAsset = String(r.baseAsset ?? r.baseCoin ?? "");
    const quoteAsset = String(r.quoteAsset ?? r.quoteCoin ?? "");
    if (!(symbolID > 0) || !symbol) continue;
    const status = r.status != null ? String(r.status) : undefined;
    out.push({
      symbol,
      symbolID,
      baseAsset,
      quoteAsset,
      minNotional: String(r.minNotional ?? "0"),
      pricePrecision: Number(r.pricePrecision ?? 8),
      quantityPrecision: Number(r.quantityPrecision ?? 8),
      tickSize: String(r.tickSize ?? "0"),
      stepSize: String(r.stepSize ?? "0"),
      minQuantity: String(r.minQuantity ?? "0"),
      lastTradePrice: String(r.lastTradePrice ?? r.lastPx ?? "0"),
      status,
    });
  }
  return out;
}

export interface NormalizedAccountState {
  accountID: number;
  balances: { asset: string; available: string; locked: string; total: string }[];
  openOrdersCount: number;
}

/**
 * Normalize account state.
 * Current SoDEX: { aid, B:[{a,t,l}], O }
 * Legacy: { accountID, balances, openOrders }
 */
export function normalizeSodexAccountState(data: unknown): NormalizedAccountState | null {
  if (!data || typeof data !== "object") return null;
  const r = data as Record<string, unknown>;
  const accountID = Number(r.accountID ?? r.aid ?? r.uid ?? 0);
  if (!(accountID > 0)) return null;

  const balances: NormalizedAccountState["balances"] = [];
  if (Array.isArray(r.balances)) {
    for (const b of r.balances) {
      if (!b || typeof b !== "object") continue;
      const row = b as Record<string, unknown>;
      balances.push({
        asset: String(row.asset ?? row.a ?? ""),
        available: String(row.available ?? row.t ?? "0"),
        locked: String(row.locked ?? row.l ?? "0"),
        total: String(row.total ?? row.t ?? "0"),
      });
    }
  } else if (Array.isArray(r.B)) {
    for (const b of r.B) {
      if (!b || typeof b !== "object") continue;
      const row = b as Record<string, unknown>;
      const total = String(row.t ?? row.wb ?? "0");
      const locked = String(row.l ?? "0");
      balances.push({
        asset: String(row.a ?? row.asset ?? ""),
        available: total,
        locked,
        total,
      });
    }
  }

  const openOrders = r.openOrders ?? r.O;
  const openOrdersCount = Array.isArray(openOrders) ? openOrders.length : 0;
  return { accountID, balances, openOrdersCount };
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
