import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { CopyTradeResult, OrderFill, SentinelReport } from "@bloom-ai/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.BLOOM_DATA_DIR ?? join(__dirname, "../../../.data");
const TRADES_FILE = join(DATA_DIR, "trades.json");
const AUDIT_FILE = join(DATA_DIR, "audit.json");

export interface TradeRecord {
  id: string;
  timestamp: string;
  strategyId: string;
  userAddress: string;
  allocationUSD: number;
  sentinelStatus: "passed" | "blocked";
  ordersCount: number;
  totalExecutedUSD: number;
  symbol: string;
  simulated: boolean;
  orders: OrderFill[];
  pnlUSD?: number;
  newsletterId?: string;
  signalId?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  type: "sentinel_block" | "execution_error" | "execution_success" | "simulated_fill";
  strategyId: string;
  userAddress: string;
  message: string;
  details?: unknown;
}

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

class TradeStore {
  private trades: TradeRecord[] = loadJson<TradeRecord[]>(TRADES_FILE, []);
  private audit: AuditEntry[] = loadJson<AuditEntry[]>(AUDIT_FILE, []);

  private persist(): void {
    saveJson(TRADES_FILE, this.trades.slice(-500));
    saveJson(AUDIT_FILE, this.audit.slice(-500));
  }

  recordTrade(record: TradeRecord): void {
    this.trades.push(record);
    this.persist();
  }

  recordAudit(entry: Omit<AuditEntry, "id" | "timestamp">): void {
    this.audit.push({
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    });
    this.persist();
  }

  recordSentinelBlock(report: SentinelReport, intent: { strategyId: string; userAddress: string }): void {
    const reasons = report.checks.filter((c) => !c.passed).map((c) => c.message).filter(Boolean).join("; ");
    this.recordAudit({
      type: "sentinel_block",
      strategyId: intent.strategyId,
      userAddress: intent.userAddress,
      message: reasons || "Sentinel blocked trade",
      details: report,
    });
  }

  recordExecution(
    intent: { strategyId: string; userAddress: string; allocationUSD: number; newsletterId?: string; signalId?: string },
    result: CopyTradeResult,
    simulated: boolean,
  ): void {
    const primarySymbol = result.orders[0]?.symbol ?? "MULTI";
    this.recordTrade({
      id: result.intentId,
      timestamp: result.timestamp,
      strategyId: intent.strategyId,
      userAddress: intent.userAddress,
      allocationUSD: intent.allocationUSD,
      sentinelStatus: result.sentinelStatus,
      ordersCount: result.orders.length,
      totalExecutedUSD: result.totalExecutedUSD,
      symbol: primarySymbol,
      simulated,
      orders: result.orders,
      newsletterId: intent.newsletterId,
      signalId: intent.signalId,
    });
    this.recordAudit({
      type: simulated ? "simulated_fill" : "execution_success",
      strategyId: intent.strategyId,
      userAddress: intent.userAddress,
      message: simulated
        ? "Order simulated — SODEX_API_PRIVATE_KEY not configured"
        : `Executed ${result.orders.length} orders for $${result.totalExecutedUSD.toFixed(2)}`,
      details: result,
    });
  }

  recordError(
    intent: { strategyId: string; userAddress: string },
    message: string,
    details?: unknown,
  ): void {
    this.recordAudit({
      type: "execution_error",
      strategyId: intent.strategyId,
      userAddress: intent.userAddress,
      message,
      details,
    });
  }

  getHistory(limit = 50): TradeRecord[] {
    return this.trades.slice(-limit).reverse();
  }

  getAudit(limit = 50): AuditEntry[] {
    return this.audit.slice(-limit).reverse();
  }

  /**
   * Mark-to-market open/executed trades using live marks keyed by base asset (BTC, ETH, …).
   * Returns how many trade records received a fresh pnlUSD.
   */
  updatePnlFromMarks(marks: Record<string, number>): number {
    const normalize = (sym: string) =>
      sym.replace(/^v/, "").split(/[_/-]/)[0].toUpperCase();

    let updated = 0;
    for (const trade of this.trades) {
      if (trade.sentinelStatus !== "passed" || !trade.orders?.length) continue;
      let pnl = 0;
      let priced = 0;
      for (const o of trade.orders) {
        const base = normalize(o.symbol);
        const mark = marks[base] ?? marks[o.symbol];
        if (!mark || !(o.fillPrice > 0) || !(o.fillQuantity > 0)) continue;
        const sideMul = o.side === 1 ? 1 : -1;
        pnl += sideMul * (mark - o.fillPrice) * o.fillQuantity;
        priced++;
      }
      if (priced === 0) continue;
      trade.pnlUSD = parseFloat(pnl.toFixed(2));
      updated++;
    }
    if (updated > 0) this.persist();
    return updated;
  }

  getPerformance() {
    const executed = this.trades.filter((t) => t.sentinelStatus === "passed");
    const blocked = this.audit.filter((a) => a.type === "sentinel_block");
    const totalTrades = executed.length;
    const totalExecuted = executed.reduce((s, t) => s + t.totalExecutedUSD, 0);

    // Per-strategy breakdown
    const byStrategy: Record<string, { trades: number; notional: number; simulated: number }> = {};
    for (const t of executed) {
      if (!byStrategy[t.strategyId]) {
        byStrategy[t.strategyId] = { trades: 0, notional: 0, simulated: 0 };
      }
      byStrategy[t.strategyId].trades++;
      byStrategy[t.strategyId].notional += t.totalExecutedUSD;
      if (t.simulated) byStrategy[t.strategyId].simulated++;
    }

    // PnL only from trades that have real MTM (fill vs mark) — never fabricate win rate
    const withPnl = executed.filter((t) => t.pnlUSD !== undefined);
    const totalPnl = withPnl.reduce((s, t) => s + (t.pnlUSD ?? 0), 0);
    const wins = withPnl.filter((t) => (t.pnlUSD ?? 0) > 0).length;
    const winRate = withPnl.length > 0 ? (wins / withPnl.length) * 100 : null;

    // Max drawdown from cumulative PnL curve
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;
    for (const t of executed) {
      cumulative += t.pnlUSD ?? 0;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    return {
      totalTrades,
      blockedTrades: blocked.length,
      totalExecutedUSD: parseFloat(totalExecuted.toFixed(2)),
      verifiedPnlUSD: parseFloat(totalPnl.toFixed(2)),
      winRate: winRate !== null ? parseFloat(winRate.toFixed(1)) : null,
      maxDrawdownUSD: parseFloat(maxDrawdown.toFixed(2)),
      avgTradeUSD: totalTrades > 0 ? parseFloat((totalExecuted / totalTrades).toFixed(2)) : 0,
      simulatedTrades: executed.filter((t) => t.simulated).length,
      liveTrades: executed.filter((t) => !t.simulated).length,
      mtmTrades: withPnl.length,
      byStrategy,
    };
  }
}

export const tradeStore = new TradeStore();
