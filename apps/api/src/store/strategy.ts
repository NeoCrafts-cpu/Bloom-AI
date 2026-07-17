import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import type {
  SSIIndex,
  SSIAssetWeight,
  SSIRebalanceEvent,
  IndexComparison,
  SoSoSsiComparison,
} from "@bloom-ai/types";
import {
  getMarketSnapshots,
  getSoSoIndexList,
  getSoSoIndexConstituents,
  constituentsToSsiAssets,
} from "../services/sosovalue.js";
import { getSymbolIdMap } from "../services/sodex.js";
import { wsManager } from "../ws/manager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.BLOOM_DATA_DIR ?? join(__dirname, "../../../.data");
const STRATEGIES_FILE = join(DATA_DIR, "strategies.json");
const HISTORY_FILE = join(DATA_DIR, "rebalance-history.json");

const LEGACY_SEED_STRATEGIES: SSIIndex[] = [
  {
    id: "ssi-mag7-003",
    name: "BLOOM-MAG7",
    symbol: "BLOOM-MAG7.ssi",
    description: "Crypto's magnificent seven — top assets by institutional adoption, ETF inflows, and on-chain activity.",
    assets: [
      { symbol: "BTC", address: "0x0000000000000000000000000000000000000001", weight: 0.35, currentPrice: 0 },
      { symbol: "ETH", address: "0x0000000000000000000000000000000000000002", weight: 0.25, currentPrice: 0 },
      { symbol: "SOL", address: "0x0000000000000000000000000000000000000003", weight: 0.15, currentPrice: 0 },
      { symbol: "BNB", address: "0x0000000000000000000000000000000000000004", weight: 0.10, currentPrice: 0 },
      { symbol: "AVAX", address: "0x0000000000000000000000000000000000000005", weight: 0.08, currentPrice: 0 },
      { symbol: "LINK", address: "0x0000000000000000000000000000000000000006", weight: 0.04, currentPrice: 0 },
      { symbol: "ARB", address: "0x0000000000000000000000000000000000000007", weight: 0.03, currentPrice: 0 },
    ],
    tvl: 14_700_000,
    dailyFee: 0.0001,
    status: "published",
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    rebalancedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "ssi-rwa-001",
    name: "BLOOM-RWA",
    symbol: "BLOOM-RWA.ssi",
    description: "AI-curated Real World Asset index based on macro rotation signals.",
    assets: [
      { symbol: "BTC", address: "0x0000000000000000000000000000000000000001", weight: 0.35, currentPrice: 0 },
      { symbol: "ETH", address: "0x0000000000000000000000000000000000000002", weight: 0.25, currentPrice: 0 },
      { symbol: "USDC", address: "0x0000000000000000000000000000000000000003", weight: 0.20, currentPrice: 0 },
      { symbol: "LINK", address: "0x0000000000000000000000000000000000000004", weight: 0.20, currentPrice: 0 },
    ],
    tvl: 8_400_000,
    dailyFee: 0.0001,
    status: "published",
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    rebalancedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "ssi-defi-002",
    name: "BLOOM-DEFI",
    symbol: "BLOOM-DEFI.ssi",
    description: "High-beta DeFi protocol basket with dynamic weighting from protocol fee growth.",
    assets: [
      { symbol: "ETH", address: "0x0000000000000000000000000000000000000002", weight: 0.40, currentPrice: 0 },
      { symbol: "BTC", address: "0x0000000000000000000000000000000000000001", weight: 0.30, currentPrice: 0 },
      { symbol: "SOL", address: "0x0000000000000000000000000000000000000005", weight: 0.30, currentPrice: 0 },
    ],
    tvl: 5_200_000,
    dailyFee: 0.0001,
    status: "published",
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    rebalancedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

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

export function validateWeights(assets: SSIAssetWeight[]): { valid: boolean; sum: number; error?: string } {
  const sum = assets.reduce((s, a) => s + a.weight, 0);
  if (Math.abs(sum - 1) > 0.01) {
    return { valid: false, sum, error: `Weights must sum to 1.0 (got ${sum.toFixed(4)})` };
  }
  return { valid: true, sum };
}

class StrategyStore {
  private strategies: SSIIndex[] = loadJson<SSIIndex[]>(STRATEGIES_FILE, []);
  private history: SSIRebalanceEvent[] = loadJson<SSIRebalanceEvent[]>(HISTORY_FILE, []);

  private persist(): void {
    saveJson(STRATEGIES_FILE, this.strategies);
    saveJson(HISTORY_FILE, this.history.slice(-200));
  }

  getAll(): SSIIndex[] {
    return this.strategies;
  }

  getById(id: string): SSIIndex | undefined {
    return this.strategies.find((s) => s.id === id);
  }

  getFallbackTemplate(): SSIIndex | undefined {
    return this.strategies[0] ?? LEGACY_SEED_STRATEGIES[0];
  }

  add(strategy: SSIIndex): void {
    this.strategies.unshift(strategy);
    this.persist();
  }

  update(id: string, patch: Partial<SSIIndex>): SSIIndex | undefined {
    const idx = this.strategies.findIndex((s) => s.id === id);
    if (idx < 0) return undefined;
    this.strategies[idx] = { ...this.strategies[idx], ...patch };
    this.persist();
    return this.strategies[idx];
  }

  rebalance(
    id: string,
    newAssets: SSIAssetWeight[],
    reason: string,
    signalId?: string,
  ): { strategy: SSIIndex; event: SSIRebalanceEvent } | { error: string } {
    const validation = validateWeights(newAssets);
    if (!validation.valid) return { error: validation.error! };

    const strategy = this.getById(id);
    if (!strategy) return { error: "Strategy not found" };

    const event: SSIRebalanceEvent = {
      id: `reb-${uuid().slice(0, 8)}`,
      strategyId: id,
      priorAssets: [...strategy.assets],
      newAssets,
      reason,
      signalId,
      timestamp: new Date().toISOString(),
    };

    strategy.assets = newAssets;
    strategy.rebalancedAt = event.timestamp;
    strategy.version = (strategy.version ?? 1) + 1;
    this.history.unshift(event);
    this.persist();

    wsManager.broadcast({
      type: "STRATEGY_REBALANCED",
      payload: { strategy, event },
      timestamp: event.timestamp,
    });

    return { strategy, event };
  }

  getHistory(strategyId: string): SSIRebalanceEvent[] {
    return this.history.filter((h) => h.strategyId === strategyId);
  }

  async compare(idA: string, idB: string, notionalUSD = 10000): Promise<IndexComparison | { error: string }> {
    const a = await this.getWithLivePrices(idA);
    const b = await this.getWithLivePrices(idB);
    if (!a || !b) return { error: "One or both strategies not found" };

    const symbols = new Set([...a.assets.map((x) => x.symbol), ...b.assets.map((x) => x.symbol)]);
    const weightDiffs = [...symbols].map((symbol) => {
      const weightA = a.assets.find((x) => x.symbol === symbol)?.weight ?? 0;
      const weightB = b.assets.find((x) => x.symbol === symbol)?.weight ?? 0;
      return { symbol, weightA, weightB, delta: weightB - weightA };
    });

    const impliedNotionalA = a.assets.reduce((s, asset) => s + notionalUSD * asset.weight, 0);
    const impliedNotionalB = b.assets.reduce((s, asset) => s + notionalUSD * asset.weight, 0);

    return { idA, idB, weightDiffs, impliedNotionalA, impliedNotionalB };
  }

  async compareSosoToSsi(
    sosoIndexId: string,
    strategyId: string,
    notionalUSD = 10000,
  ): Promise<SoSoSsiComparison | { error: string }> {
    const [indexes, constituentsResult, ssi] = await Promise.all([
      getSoSoIndexList(),
      getSoSoIndexConstituents(sosoIndexId),
      this.getWithLivePrices(strategyId),
    ]);
    if (!ssi) return { error: "Strategy not found" };
    if (!constituentsResult.data.length) {
      return { error: `SoSo index "${sosoIndexId}" has no constituents` };
    }

    const sosoAssets = constituentsToSsiAssets(constituentsResult.data);
    const meta = indexes.data.find((i) => (i.id ?? i.index_id ?? i.symbol) === sosoIndexId);
    const symbols = new Set([
      ...sosoAssets.map((x) => x.symbol),
      ...ssi.assets.map((x) => x.symbol),
    ]);
    const weightDiffs = [...symbols].map((symbol) => {
      const weightSoso = sosoAssets.find((x) => x.symbol === symbol)?.weight ?? 0;
      const weightSsi = ssi.assets.find((x) => x.symbol === symbol)?.weight ?? 0;
      return { symbol, weightSoso, weightSsi, delta: weightSsi - weightSoso };
    });

    return {
      sosoIndexId,
      sosoName: meta?.name ?? sosoIndexId.toUpperCase(),
      strategyId,
      strategyName: ssi.name,
      weightDiffs,
      impliedNotionalSoso: sosoAssets.reduce((s, a) => s + notionalUSD * a.weight, 0),
      impliedNotionalSsi: ssi.assets.reduce((s, a) => s + notionalUSD * a.weight, 0),
      notionalUSD,
    };
  }

  async mirrorFromSoso(
    sosoIndexId: string,
    opts?: { name?: string; description?: string },
  ): Promise<{ strategy: SSIIndex } | { error: string }> {
    const [indexes, constituentsResult] = await Promise.all([
      getSoSoIndexList(),
      getSoSoIndexConstituents(sosoIndexId),
    ]);
    if (!constituentsResult.data.length) {
      return { error: `SoSo index "${sosoIndexId}" has no constituents — cannot mirror` };
    }

    const assets = constituentsToSsiAssets(constituentsResult.data);
    const validation = validateWeights(assets);
    if (!validation.valid) return { error: validation.error! };

    const meta = indexes.data.find((i) => (i.id ?? i.index_id ?? i.symbol) === sosoIndexId);
    const label = opts?.name ?? `BLOOM-${(meta?.name ?? sosoIndexId).toUpperCase()}`;
    const strategy: SSIIndex = {
      id: `ssi-${uuid().slice(0, 8)}`,
      name: label,
      symbol: `${label.replace(/\s+/g, "-")}.ssi`,
      description:
        opts?.description ??
        `Mirrored from SoSoValue index ${sosoIndexId}${constituentsResult.isStale ? " (stale cache)" : ""}`,
      assets,
      tvl: 0,
      dailyFee: 0.0001,
      status: "draft",
      version: 1,
      createdAt: new Date().toISOString(),
      rebalancedAt: new Date().toISOString(),
      sourceSosoIndexId: sosoIndexId,
    };

    this.add(strategy);
    wsManager.broadcast({
      type: "STRATEGY_CREATED",
      payload: { strategy, source: "soso-mirror", sosoIndexId },
      timestamp: strategy.createdAt,
    });
    return { strategy };
  }

  async getTradability(): Promise<Record<string, boolean>> {
    const map = await getSymbolIdMap().catch(() => ({} as Record<string, number>));
    const result: Record<string, boolean> = {};
    for (const s of this.strategies) {
      for (const a of s.assets) {
        result[a.symbol] = !!map[a.symbol];
      }
    }
    return result;
  }

  async getWithLivePrices(id: string): Promise<SSIIndex | undefined> {
    const template = this.getById(id);
    if (!template) return undefined;

    const marketResult = await getMarketSnapshots().catch(() => null);
    const priceMap: Record<string, number> = {};
    if (marketResult?.data) {
      for (const m of marketResult.data) priceMap[m.symbol] = m.price;
    }

    return {
      ...template,
      assets: template.assets.map((a) => ({
        ...a,
        currentPrice: priceMap[a.symbol] ?? a.currentPrice,
      })),
    };
  }
}

export const strategyStore = new StrategyStore();
