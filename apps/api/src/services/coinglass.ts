/**
 * Coinglass public/free-tier helpers for OI + funding enrichment.
 * Gracefully returns empty when unavailable (no key / rate limit).
 */
import { cache, TTL } from "../lib/cache.js";
import { config } from "../config.js";

export interface CoinglassMetrics {
  symbol: string;
  openInterestUSD: number | null;
  fundingRate: number | null;
  oiChange24hPct: number | null;
}

async function fetchCoinglass(symbol: string): Promise<CoinglassMetrics> {
  const empty: CoinglassMetrics = {
    symbol,
    openInterestUSD: null,
    fundingRate: null,
    oiChange24hPct: null,
  };

  // Prefer optional Coinglass key; otherwise try public endpoints cautiously
  const key = process.env.COINGLASS_API_KEY ?? "";
  try {
    if (key) {
      const res = await fetch(
        `https://open-api.coinglass.com/public/v2/funding?symbol=${symbol}&time_type=h8`,
        {
          headers: { "coinglassSecret": key, Accept: "application/json" },
          signal: AbortSignal.timeout(6000),
        },
      );
      if (res.ok) {
        const json = (await res.json()) as { data?: { rate?: number; uMarginOpen?: number }[] };
        const row = json.data?.[0];
        return {
          symbol,
          openInterestUSD: row?.uMarginOpen ?? null,
          fundingRate: row?.rate ?? null,
          oiChange24hPct: null,
        };
      }
    }

    // Fallback: Binance public futures premium index (free, no key)
    const binanceSym = `${symbol}USDT`;
    const [premium, oi] = await Promise.all([
      fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${binanceSym}`, {
        signal: AbortSignal.timeout(5000),
      }).then((r) => (r.ok ? r.json() as Promise<{ lastFundingRate?: string }> : null)),
      fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${binanceSym}`, {
        signal: AbortSignal.timeout(5000),
      }).then((r) => (r.ok ? r.json() as Promise<{ openInterest?: string }> : null)),
    ]);

    return {
      symbol,
      openInterestUSD: oi?.openInterest ? parseFloat(oi.openInterest) : null,
      fundingRate: premium?.lastFundingRate ? parseFloat(premium.lastFundingRate) : null,
      oiChange24hPct: null,
    };
  } catch {
    return empty;
  }
}

export async function getDerivativesMetrics(symbol: string): Promise<CoinglassMetrics> {
  try {
    const result = await cache.get(`deriv-${symbol}`, TTL.COINGLASS, () => fetchCoinglass(symbol));
    return result.data;
  } catch {
    return { symbol, openInterestUSD: null, fundingRate: null, oiChange24hPct: null };
  }
}

// Silence unused config import if COINGLASS not on config yet
void config;
