/**
 * In-memory TTL cache with stale-while-revalidate semantics.
 * Entries are served from cache if fresh. On TTL expiry, the next
 * call will attempt a fresh fetch; if it fails, the stale entry is
 * returned so the UI always has something to display.
 */

interface CacheEntry<T> {
  data: T;
  cachedAt: number; // Unix ms
  ttlMs: number;
}

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Get data from cache or fetch it.
   * If the fetch fails and we have stale data, the stale data is returned.
   * If there is no data at all (first call + fetch failure), the error is re-thrown.
   */
  async get<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>,
  ): Promise<{ data: T; cachedAt: number; isStale: boolean }> {
    const now = Date.now();
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (entry && now - entry.cachedAt < entry.ttlMs) {
      return { data: entry.data, cachedAt: entry.cachedAt, isStale: false };
    }

    try {
      const data = await fetcher();
      this.store.set(key, { data, cachedAt: now, ttlMs });
      return { data, cachedAt: now, isStale: false };
    } catch (err) {
      if (entry) {
        // Return stale data rather than throwing
        console.warn(`[Cache] Fetch failed for "${key}", serving stale data (age: ${Math.round((now - entry.cachedAt) / 1000)}s):`, err);
        return { data: entry.data, cachedAt: entry.cachedAt, isStale: true };
      }
      throw err;
    }
  }

  /** Synchronously get a cached entry (fresh or stale), or null if absent. */
  peek<T>(key: string): { data: T; cachedAt: number; isStale: boolean } | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    return {
      data: entry.data,
      cachedAt: entry.cachedAt,
      isStale: Date.now() - entry.cachedAt >= entry.ttlMs,
    };
  }

  invalidate(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

export const cache = new TTLCache();

// TTL constants (ms)
export const TTL = {
  ETF_FLOWS:     5 * 60 * 1000,  // 5 min — SoSoValue has strict rate limits
  NEWS_SENTIMENT: 2 * 60 * 1000, // 2 min
  MARKET_PRICES:     15 * 1000,  // 15s — SoDEX tickers are public + no rate limit
  SODEX_ORDERBOOK:   10 * 1000,  // 10s
  SODEX_SYMBOLS:  10 * 60 * 1000, // 10 min — symbols rarely change
  ACCOUNT_STATE:     30 * 1000,  // 30s
  DEFI_TVL:      15 * 60 * 1000, // 15 min
  CRYPTO_NEWS:    5 * 60 * 1000, // 5 min
} as const;
