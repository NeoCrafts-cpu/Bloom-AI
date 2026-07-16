import { createRequire } from "module";
import { config } from "../config.js";

const require = createRequire(import.meta.url);

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>;
  connect(): Promise<void>;
  disconnect(): void;
  on(event: string, cb: (err: Error) => void): void;
}

let client: RedisLike | null = null;
let connectAttempted = false;

export function getRedis(): RedisLike | null {
  if (connectAttempted) return client;
  connectAttempted = true;

  if (!config.REDIS_URL || process.env.REDIS_DISABLED === "1") {
    console.log("[Redis] Disabled — using in-memory fallbacks");
    return null;
  }

  try {
    const mod = require("ioredis") as { default?: new (url: string, opts?: object) => RedisLike } & (
      new (url: string, opts?: object) => RedisLike
    );
    const RedisCtor = (mod.default ?? mod) as new (url: string, opts?: object) => RedisLike;
    const r = new RedisCtor(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    r.on("error", (err: Error) => {
      console.warn("[Redis] error:", err.message);
    });
    void r.connect().then(() => {
      client = r;
      console.log("[Redis] Connected");
    }).catch((err: Error) => {
      console.warn("[Redis] connect failed — memory fallback:", err.message);
      try { r.disconnect(); } catch { /* ignore */ }
      client = null;
    });
    client = r;
  } catch (err) {
    console.warn("[Redis] init failed:", (err as Error).message);
    client = null;
  }

  return client;
}

export async function redisGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get(key);
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: string, ttlSec?: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    if (ttlSec) await r.set(key, value, "EX", ttlSec);
    else await r.set(key, value);
  } catch {
    // ignore
  }
}
