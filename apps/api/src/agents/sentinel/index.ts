import type { CopyTradeIntent, SentinelReport, SentinelCheck } from "@bloom-ai/types";
import { config } from "../../config.js";
import {
  getDailySpend,
  recordSpend,
  getLossStreak,
  recordLoss as persistLoss,
  resetLossStreak as persistResetLoss,
} from "../../store/sentinelState.js";

export let sentinelStatus: {
  status: "running" | "idle" | "error";
  lastRun: string | null;
  lastError: string | null;
  lastPreview: SentinelReport | null;
  cycleCount: number;
} = { status: "idle", lastRun: null, lastError: null, lastPreview: null, cycleCount: 0 };

/** Dry-run risk preview for pipeline — uses a conservative default intent */
export function runSentinelPreview(strategyId: string): SentinelReport {
  sentinelStatus.status = "running";
  try {
    const report = runSentinel({
      strategyId,
      newsletterId: "pipeline-preview",
      userAddress: "0x0000000000000000000000000000000000000001",
      allocationUSD: 100,
      maxSlippageBps: 50,
    });
    sentinelStatus.status = "idle";
    sentinelStatus.lastRun = new Date().toISOString();
    sentinelStatus.lastPreview = report;
    sentinelStatus.cycleCount++;
    return report;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    sentinelStatus.status = "error";
    sentinelStatus.lastError = msg;
    throw err;
  }
}

/** Call this when a trade fails to increment the streak */
export function recordLoss(userAddress: string): void {
  persistLoss(userAddress);
}

/** Reset streak on a successful trade */
export function resetLossStreak(userAddress: string): void {
  persistResetLoss(userAddress);
}

/** Whitelisted SoDEX / ValueChain routing targets */
const WHITELISTED_ADDRESSES = new Set([
  "testnet-gw.sodex.dev",
  "mainnet-gw.sodex.dev",
  "valuechain",
]);

/**
 * Sentinel — deterministic, hardcoded circuit breaker.
 * No LLM involved. Evaluates raw intent against strict numeric limits.
 * If ANY check fails, the entire intent is BLOCKED and not forwarded to Broker.
 */
export function runSentinel(intent: CopyTradeIntent): SentinelReport {
  const checks: SentinelCheck[] = [];
  const now = new Date().toISOString();

  // ── Check 1: Max single order size ──────────────────────────────────────────
  const maxOrder = config.SENTINEL_MAX_ORDER_USD;
  checks.push({
    rule: "MAX_ORDER_USD",
    passed: intent.allocationUSD <= maxOrder,
    actual: intent.allocationUSD,
    limit: maxOrder,
    message:
      intent.allocationUSD > maxOrder
        ? `Order $${intent.allocationUSD} exceeds max $${maxOrder}`
        : undefined,
  });

  // ── Check 2: Max slippage tolerance ─────────────────────────────────────────
  const maxSlippage = config.SENTINEL_MAX_SLIPPAGE_BPS;
  checks.push({
    rule: "MAX_SLIPPAGE_BPS",
    passed: intent.maxSlippageBps <= maxSlippage,
    actual: intent.maxSlippageBps,
    limit: maxSlippage,
    message:
      intent.maxSlippageBps > maxSlippage
        ? `Slippage ${intent.maxSlippageBps}bps exceeds max ${maxSlippage}bps`
        : undefined,
  });

  // ── Check 3: Daily USD exposure limit per user ────────────────────────────────
  const maxDaily = config.SENTINEL_MAX_DAILY_USD;
  const currentDaily = getDailySpend(intent.userAddress);
  const projectedDaily = currentDaily + intent.allocationUSD;
  checks.push({
    rule: "MAX_DAILY_USD",
    passed: projectedDaily <= maxDaily,
    actual: projectedDaily,
    limit: maxDaily,
    message:
      projectedDaily > maxDaily
        ? `Projected daily spend $${projectedDaily.toFixed(2)} exceeds limit $${maxDaily}`
        : undefined,
  });

  // ── Check 4: Non-zero allocation ─────────────────────────────────────────────
  checks.push({
    rule: "POSITIVE_ALLOCATION",
    passed: intent.allocationUSD > 0,
    actual: intent.allocationUSD,
    limit: 0,
    message: intent.allocationUSD <= 0 ? "Allocation must be positive" : undefined,
  });

  // ── Check 5: User address format (basic EVM validation) ──────────────────────
  const validAddress = /^0x[0-9a-fA-F]{40}$/.test(intent.userAddress);
  checks.push({
    rule: "VALID_USER_ADDRESS",
    passed: validAddress,
    actual: intent.userAddress,
    limit: "0x[40 hex chars]",
    message: !validAddress ? "Invalid EVM address format" : undefined,
  });

  // ── Check 6: Strategy ID must be non-empty ───────────────────────────────────
  checks.push({
    rule: "VALID_STRATEGY_ID",
    passed: intent.strategyId.length > 0,
    actual: intent.strategyId,
    limit: "non-empty",
    message: !intent.strategyId ? "strategyId cannot be empty" : undefined,
  });

  // ── Check 7: ATR volatility proxy — high slippage tolerance signals high-vol ──
  // If the user's maxSlippageBps > ATR_THRESHOLD_BPS we treat this as a
  // high-volatility environment (proxy for ATR spike) and block the trade.
  const atrThreshold = config.SENTINEL_ATR_THRESHOLD_BPS;
  checks.push({
    rule: "ATR_VOLATILITY_FILTER",
    passed: intent.maxSlippageBps <= atrThreshold,
    actual: intent.maxSlippageBps,
    limit: atrThreshold,
    message:
      intent.maxSlippageBps > atrThreshold
        ? `Slippage ${intent.maxSlippageBps}bps indicates high-volatility regime (ATR proxy >${atrThreshold}bps) — trade blocked`
        : undefined,
  });

  // ── Check 8: Consecutive-loss circuit breaker ─────────────────────────────────
  const maxLosses = config.SENTINEL_MAX_CONSECUTIVE_LOSSES;
  const streak = getLossStreak(intent.userAddress);
  checks.push({
    rule: "CIRCUIT_BREAKER",
    passed: streak < maxLosses,
    actual: streak,
    limit: maxLosses,
    message:
      streak >= maxLosses
        ? `${streak} consecutive losses detected — circuit breaker tripped. Reset required after manual review.`
        : undefined,
  });

  // ── Check 9: Perps leverage cap ───────────────────────────────────────────────
  if (intent.venue === "perps") {
    const lev = intent.leverage ?? 1;
    const maxLev = config.SENTINEL_MAX_LEVERAGE;
    checks.push({
      rule: "MAX_LEVERAGE",
      passed: lev > 0 && lev <= maxLev && config.SODEX_ENABLE_PERPS_COPY,
      actual: lev,
      limit: maxLev,
      message:
        !config.SODEX_ENABLE_PERPS_COPY
          ? "Perps copy-trade disabled"
          : lev > maxLev
            ? `Leverage ${lev}x exceeds max ${maxLev}x`
            : undefined,
    });
  }

  // ── Check 10: Mainnet requires explicit confirmation flag via signature ──────
  if (config.SODEX_NETWORK === "mainnet") {
    checks.push({
      rule: "MAINNET_CONFIRMATION",
      passed: !!intent.userSignature,
      actual: intent.userSignature ? "signed" : "unsigned",
      limit: "signed",
      message: !intent.userSignature
        ? "Mainnet trades require wallet EIP-712 confirmation"
        : undefined,
    });
  }

  void WHITELISTED_ADDRESSES; // reserved for contract-routing checks

  const passed = checks.every((c) => c.passed);

  // Record spend only if passing; reset loss streak on clean pass
  if (passed) {
    recordSpend(intent.userAddress, intent.allocationUSD);
    resetLossStreak(intent.userAddress);
  }

  return {
    intentId: `${intent.strategyId}:${intent.userAddress}:${Date.now()}`,
    passed,
    checks,
    timestamp: now,
  };
}
