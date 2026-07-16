import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.BLOOM_DATA_DIR ?? join(__dirname, "../../../.data");
const FILE = join(DATA_DIR, "sentinel-state.json");

interface SentinelPersisted {
  dailySpend: Record<string, { amount: number; resetAt: number }>;
  lossStreak: Record<string, number>;
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function load(): SentinelPersisted {
  ensureDataDir();
  if (!existsSync(FILE)) return { dailySpend: {}, lossStreak: {} };
  try {
    return JSON.parse(readFileSync(FILE, "utf-8")) as SentinelPersisted;
  } catch {
    return { dailySpend: {}, lossStreak: {} };
  }
}

function save(state: SentinelPersisted): void {
  ensureDataDir();
  writeFileSync(FILE, JSON.stringify(state, null, 2), "utf-8");
}

const state = load();

export function getDailySpend(userAddress: string): number {
  const entry = state.dailySpend[userAddress.toLowerCase()];
  if (!entry) return 0;
  if (Date.now() > entry.resetAt) return 0;
  return entry.amount;
}

export function recordSpend(userAddress: string, amountUSD: number): void {
  const key = userAddress.toLowerCase();
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  const existing = state.dailySpend[key];
  if (!existing || Date.now() > existing.resetAt) {
    state.dailySpend[key] = { amount: amountUSD, resetAt: midnight.getTime() };
  } else {
    existing.amount += amountUSD;
  }
  save(state);
}

export function getLossStreak(userAddress: string): number {
  return state.lossStreak[userAddress.toLowerCase()] ?? 0;
}

export function recordLoss(userAddress: string): void {
  const key = userAddress.toLowerCase();
  state.lossStreak[key] = (state.lossStreak[key] ?? 0) + 1;
  save(state);
}

export function resetLossStreak(userAddress: string): void {
  delete state.lossStreak[userAddress.toLowerCase()];
  save(state);
}
