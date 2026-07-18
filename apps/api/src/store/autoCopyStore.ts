import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import type { AutoCopyRun, AutoCopySubscription } from "@bloom-ai/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.BLOOM_DATA_DIR ?? join(__dirname, "../../../.data");
const SUBS_FILE = join(DATA_DIR, "auto-copy.json");
const RUNS_FILE = join(DATA_DIR, "auto-copy-runs.json");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson<T>(file: string, fallback: T): T {
  ensureDataDir();
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function saveJson<T>(file: string, data: T): void {
  ensureDataDir();
  writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

class AutoCopyStore {
  private subs: AutoCopySubscription[] = loadJson(SUBS_FILE, []);
  private runs: AutoCopyRun[] = loadJson(RUNS_FILE, []);

  private persist(): void {
    saveJson(SUBS_FILE, this.subs);
    saveJson(RUNS_FILE, this.runs.slice(-300));
  }

  private rollDaily(sub: AutoCopySubscription): void {
    const today = dayKey();
    if (sub.spentDayKey !== today) {
      sub.spentDayKey = today;
      sub.spentTodayUSD = 0;
    }
  }

  listEnabled(): AutoCopySubscription[] {
    return this.subs.filter((s) => s.enabled);
  }

  getByAddress(address: string): AutoCopySubscription | null {
    const hit = this.subs.find((s) => s.userAddress.toLowerCase() === address.toLowerCase());
    if (!hit) return null;
    this.rollDaily(hit);
    return hit;
  }

  upsert(sub: AutoCopySubscription): AutoCopySubscription {
    const idx = this.subs.findIndex(
      (s) => s.userAddress.toLowerCase() === sub.userAddress.toLowerCase(),
    );
    if (idx >= 0) this.subs[idx] = sub;
    else this.subs.push(sub);
    this.persist();
    return sub;
  }

  enable(input: {
    userAddress: string;
    maxAllocationUSD: number;
    maxDailyUSD: number;
    maxSlippageBps: number;
    venue: "spot" | "perps";
    grantSignature: string;
    grantExpiresAt: number;
    grantNonce: number;
  }): AutoCopySubscription {
    const now = new Date().toISOString();
    const existing = this.getByAddress(input.userAddress);
    const next: AutoCopySubscription = {
      id: existing?.id ?? `ac-${uuid().slice(0, 8)}`,
      userAddress: input.userAddress,
      enabled: true,
      maxAllocationUSD: input.maxAllocationUSD,
      maxDailyUSD: input.maxDailyUSD,
      maxSlippageBps: input.maxSlippageBps,
      venue: input.venue,
      mode: "latest_pipeline",
      grantSignature: input.grantSignature,
      grantExpiresAt: input.grantExpiresAt,
      grantNonce: input.grantNonce,
      spentTodayUSD: existing?.spentTodayUSD ?? 0,
      spentDayKey: existing?.spentDayKey ?? dayKey(),
      lastRunAt: existing?.lastRunAt ?? null,
      lastError: null,
      lastStrategyId: existing?.lastStrategyId ?? null,
      lastResult: existing?.lastResult ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.rollDaily(next);
    return this.upsert(next);
  }

  disable(address: string): AutoCopySubscription | null {
    const sub = this.getByAddress(address);
    if (!sub) return null;
    sub.enabled = false;
    sub.updatedAt = new Date().toISOString();
    this.persist();
    return sub;
  }

  canAfford(sub: AutoCopySubscription, allocationUSD: number): boolean {
    this.rollDaily(sub);
    return sub.spentTodayUSD + allocationUSD <= sub.maxDailyUSD + 1e-9;
  }

  recordSpend(sub: AutoCopySubscription, amountUSD: number): void {
    this.rollDaily(sub);
    sub.spentTodayUSD = parseFloat((sub.spentTodayUSD + amountUSD).toFixed(2));
    sub.updatedAt = new Date().toISOString();
    this.persist();
  }

  recordRun(run: Omit<AutoCopyRun, "id" | "timestamp"> & { timestamp?: string }): AutoCopyRun {
    const entry: AutoCopyRun = {
      ...run,
      id: `acr-${Date.now().toString(36)}`,
      timestamp: run.timestamp ?? new Date().toISOString(),
    };
    this.runs.push(entry);
    const sub = this.subs.find((s) => s.id === run.subscriptionId);
    if (sub) {
      sub.lastRunAt = entry.timestamp;
      sub.lastStrategyId = run.strategyId;
      sub.lastResult = run.status;
      sub.lastError = run.status === "error" || run.status === "skipped" ? run.message : null;
      sub.updatedAt = entry.timestamp;
    }
    this.persist();
    return entry;
  }

  getRuns(address?: string, limit = 30): AutoCopyRun[] {
    const list = address
      ? this.runs.filter((r) => r.userAddress.toLowerCase() === address.toLowerCase())
      : this.runs;
    return list.slice(-limit).reverse();
  }
}

export const autoCopyStore = new AutoCopyStore();
