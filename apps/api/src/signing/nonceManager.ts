/**
 * Atomic nonce manager for SoDEX API.
 * Uses Redis when available; falls back to in-memory counters.
 */
import { redisGet, redisSet, getRedis } from "../lib/redis.js";

class NonceManager {
  private counters: Map<string, number> = new Map();

  async getNonce(apiKeyAddress: string): Promise<number> {
    const key = apiKeyAddress.toLowerCase();
    const redisKey = `bloom:nonce:${key}`;
    const now = Date.now();
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

    const redis = getRedis();
    if (redis) {
      try {
        const existing = await redisGet(redisKey);
        let next: number;
        if (!existing) {
          next = now;
        } else {
          const current = parseInt(existing, 10);
          next = current < now - TWO_DAYS_MS ? now : current + 1;
        }
        await redisSet(redisKey, String(next + 1));
        this.counters.set(key, next + 1);
        return next;
      } catch {
        // fall through to memory
      }
    }

    const current = this.counters.get(key);
    if (current === undefined) {
      this.counters.set(key, now + 1);
      return now;
    }
    if (current < now - TWO_DAYS_MS) {
      this.counters.set(key, now + 1);
      return now;
    }
    this.counters.set(key, current + 1);
    return current;
  }

  fastForward(apiKeyAddress: string): void {
    const key = apiKeyAddress.toLowerCase();
    this.counters.set(key, Date.now());
    void redisSet(`bloom:nonce:${key}`, String(Date.now()));
  }

  peek(apiKeyAddress: string): number {
    return this.counters.get(apiKeyAddress.toLowerCase()) ?? Date.now();
  }
}

const manager = new NonceManager();

export async function getNonce(apiKeyAddress: string): Promise<number> {
  return manager.getNonce(apiKeyAddress);
}

export function fastForwardNonce(apiKeyAddress: string): void {
  manager.fastForward(apiKeyAddress);
}
