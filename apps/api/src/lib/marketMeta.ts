export type MarketDataStatus = "live" | "stale" | "empty" | "unavailable";

export interface MarketResponseMeta {
  cachedAt: number | null;
  isStale: boolean;
  status: MarketDataStatus;
  message?: string;
  source?: "sodex" | "coingecko" | "seed";
}

export function resolveMarketStatus(
  data: unknown[],
  isStale: boolean,
  cachedAt: number | null,
): MarketDataStatus {
  if (data.length === 0) {
    if (cachedAt) return isStale ? "stale" : "empty";
    return "unavailable";
  }
  if (isStale) return "stale";
  return "live";
}

export function marketEnvelope<T>(
  data: T,
  opts: {
    cachedAt: number | null;
    isStale: boolean;
    status?: MarketDataStatus;
    message?: string;
    source?: "sodex" | "coingecko" | "seed";
  },
): { data: T; meta: MarketResponseMeta } {
  const arr = Array.isArray(data) ? data : [];
  const status = opts.status ?? resolveMarketStatus(arr, opts.isStale, opts.cachedAt);
  return {
    data,
    meta: {
      cachedAt: opts.cachedAt,
      isStale: opts.isStale,
      status,
      ...(opts.message ? { message: opts.message } : {}),
      ...(opts.source ? { source: opts.source } : {}),
    },
  };
}

export function unavailableEnvelope<T>(data: T, message: string): { data: T; meta: MarketResponseMeta } {
  return marketEnvelope(data, {
    cachedAt: null,
    isStale: false,
    status: "unavailable",
    message,
  });
}
