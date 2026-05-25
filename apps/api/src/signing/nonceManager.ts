/**
 * Atomic nonce manager for SoDEX API.
 *
 * Rules:
 * - 100 highest nonces stored per API key address on SoDEX
 * - Every new nonce must be unique and larger than the smallest in that set
 * - Valid range: (T - 2 days, T + 1 day) in Unix milliseconds
 * - Use separate namespaces for different trading processes (spot vs perps)
 *
 * In production this should be backed by Redis for atomicity across instances.
 * For the hackathon, we use an in-memory atomic counter with ms-timestamp init.
 */

class NonceManager {
  private counters: Map<string, number> = new Map();

  /**
   * Get and atomically increment the nonce for a given API key address.
   * Initializes to Date.now() on first call to satisfy the temporal bound.
   */
  getNonce(apiKeyAddress: string): number {
    const key = apiKeyAddress.toLowerCase();
    const current = this.counters.get(key);

    if (current === undefined) {
      // First use: initialize to current Unix ms timestamp
      const initial = Date.now();
      this.counters.set(key, initial + 1);
      return initial;
    }

    // Ensure we never go out of the valid temporal window (T-2d, T+1d)
    const now = Date.now();
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

    // If counter has drifted far behind (e.g. long-running process), fast-forward
    if (current < now - TWO_DAYS_MS) {
      const forwarded = now;
      this.counters.set(key, forwarded + 1);
      return forwarded;
    }

    this.counters.set(key, current + 1);
    return current;
  }

  /** Reset counter to current time (useful after gaps in trading) */
  fastForward(apiKeyAddress: string): void {
    const key = apiKeyAddress.toLowerCase();
    this.counters.set(key, Date.now());
  }

  /** Get current counter value without incrementing */
  peek(apiKeyAddress: string): number {
    return this.counters.get(apiKeyAddress.toLowerCase()) ?? Date.now();
  }
}

// Singleton instance
const manager = new NonceManager();

export async function getNonce(apiKeyAddress: string): Promise<number> {
  return manager.getNonce(apiKeyAddress);
}

export function fastForwardNonce(apiKeyAddress: string): void {
  manager.fastForward(apiKeyAddress);
}
