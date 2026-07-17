/**
 * In-memory mark / spot price cache fed by SoDEX WS + REST fallbacks.
 * Used for mark-to-market PnL on executed copy-trades.
 */

const marks = new Map<string, number>();
let lastUpdatedAt: number | null = null;

function toBase(symbol: string): string {
  return symbol
    .replace(/^v/, "")
    .split(/[_/-]/)[0]
    .toUpperCase();
}

export function setMarkPrice(symbol: string, price: number): void {
  if (!Number.isFinite(price) || price <= 0) return;
  marks.set(toBase(symbol), price);
  marks.set(symbol, price);
  lastUpdatedAt = Date.now();
}

export function setMarkPrices(entries: { symbol: string; price: number }[]): void {
  for (const e of entries) setMarkPrice(e.symbol, e.price);
}

export function getMarkPrice(symbol: string): number | undefined {
  return marks.get(toBase(symbol)) ?? marks.get(symbol);
}

export function getAllMarkPrices(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of marks) {
    if (!k.includes("_") && !k.includes("-") && !k.includes("/")) {
      out[k] = v;
    }
  }
  return out;
}

export function getMarkPriceCacheStatus() {
  return {
    symbols: marks.size,
    lastUpdatedAt,
  };
}
