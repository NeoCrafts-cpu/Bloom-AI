import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import type {
  VerifiedSignal,
  SignalOutcome,
  SignalEvidence,
  SignalSource,
  SignalStatus,
  LedgerStats,
  SentinelReport,
} from "@bloom-ai/types";
import { sha256Digest, hashSignature } from "../lib/digest.js";
import { wsManager } from "../ws/manager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.BLOOM_DATA_DIR ?? join(__dirname, "../../../.data");
const SIGNALS_FILE = join(DATA_DIR, "signals.json");
const OUTCOMES_FILE = join(DATA_DIR, "outcomes.json");

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

class SignalLedgerStore {
  private signals: VerifiedSignal[] = loadJson<VerifiedSignal[]>(SIGNALS_FILE, []);
  private outcomes: SignalOutcome[] = loadJson<SignalOutcome[]>(OUTCOMES_FILE, []);

  private persist(): void {
    saveJson(SIGNALS_FILE, this.signals.slice(-1000));
    saveJson(OUTCOMES_FILE, this.outcomes.slice(-1000));
  }

  recordSignal(input: {
    source: SignalSource;
    title: string;
    summary: string;
    narrative?: VerifiedSignal["narrative"];
    keyAssets: string[];
    newsletterId?: string;
    strategyId?: string;
    evidence: SignalEvidence[];
    inputData: unknown;
    contentData: unknown;
    modelVersion?: string;
    score?: number;
  }): VerifiedSignal {
    const signal: VerifiedSignal = {
      id: `sig-${uuid().slice(0, 8)}`,
      source: input.source,
      title: input.title,
      summary: input.summary,
      publishedAt: new Date().toISOString(),
      narrative: input.narrative,
      keyAssets: input.keyAssets,
      newsletterId: input.newsletterId,
      strategyId: input.strategyId,
      inputDigest: sha256Digest(input.inputData),
      contentDigest: sha256Digest(input.contentData),
      modelVersion: input.modelVersion,
      status: "open",
      evidence: input.evidence,
      score: input.score,
    };
    this.signals.unshift(signal);
    this.persist();
    wsManager.broadcast({ type: "SIGNAL_RECORDED", payload: signal, timestamp: signal.publishedAt });
    return signal;
  }

  linkStrategy(signalId: string, strategyId: string): void {
    const s = this.signals.find((x) => x.id === signalId);
    if (s) {
      s.strategyId = strategyId;
      this.persist();
    }
  }

  updateStatus(signalId: string, status: SignalStatus): void {
    const s = this.signals.find((x) => x.id === signalId);
    if (s) {
      s.status = status;
      this.persist();
    }
  }

  recordBlocked(signalId: string | undefined, report: SentinelReport, intent: {
    strategyId: string;
    userAddress: string;
    allocationUSD: number;
    newsletterId?: string;
  }): void {
    if (signalId) this.updateStatus(signalId, "blocked");
    this.outcomes.push({
      signalId: signalId ?? `blocked-${Date.now()}`,
      strategyId: intent.strategyId,
      userAddress: intent.userAddress,
      entryNotionalUSD: intent.allocationUSD,
      newsletterId: intent.newsletterId,
      verification: { sentinelPassed: false, executionMode: "simulated" },
    });
    this.persist();
  }

  recordExecution(input: {
    signalId?: string;
    tradeId: string;
    strategyId: string;
    userAddress: string;
    allocationUSD: number;
    newsletterId?: string;
    simulated: boolean;
    userSignature?: string;
    totalExecutedUSD: number;
  }): SignalOutcome {
    if (input.signalId) this.updateStatus(input.signalId, "executed");
    const outcome: SignalOutcome = {
      signalId: input.signalId ?? input.tradeId,
      tradeId: input.tradeId,
      strategyId: input.strategyId,
      userAddress: input.userAddress,
      entryNotionalUSD: input.allocationUSD,
      exitNotionalUSD: input.totalExecutedUSD,
      newsletterId: input.newsletterId,
      verification: {
        sentinelPassed: true,
        executionMode: input.simulated ? "simulated" : "live",
        userSignatureHash: input.userSignature ? hashSignature(input.userSignature) : undefined,
      },
    };
    this.outcomes.unshift(outcome);
    this.persist();
    return outcome;
  }

  getSignals(limit = 50, source?: SignalSource): VerifiedSignal[] {
    let list = this.signals;
    if (source) list = list.filter((s) => s.source === source);
    return list.slice(0, limit);
  }

  getSignalById(id: string): VerifiedSignal | undefined {
    return this.signals.find((s) => s.id === id);
  }

  getOutcomes(limit = 50): SignalOutcome[] {
    return this.outcomes.slice(0, limit);
  }

  getStats(): LedgerStats {
    const bySource: Record<SignalSource, number> = {
      journalist: 0,
      chartanalyst: 0,
      strategist: 0,
      discovery: 0,
    };
    for (const s of this.signals) bySource[s.source]++;
    return {
      totalSignals: this.signals.length,
      openSignals: this.signals.filter((s) => s.status === "open").length,
      executedSignals: this.signals.filter((s) => s.status === "executed").length,
      blockedSignals: this.signals.filter((s) => s.status === "blocked").length,
      resolvedSignals: this.signals.filter((s) => s.status === "resolved").length,
      bySource,
    };
  }
}

export const signalLedger = new SignalLedgerStore();
