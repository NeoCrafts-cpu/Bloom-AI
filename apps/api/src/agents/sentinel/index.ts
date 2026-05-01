import type { CopyTradeIntent, SentinelReport, SentinelCheck } from "@bloom-ai/types";
import { config } from "../../config.js";

/** Daily spend tracker — in production backed by Redis */
const dailySpend: Map<string, { amount: number; resetAt: number }> = new Map();

function getDailySpend(userAddress: string): number {
  const entry = dailySpend.get(userAddress.toLowerCase());
  if (!entry) return 0;
  if (Date.now() > entry.resetAt) return 0; // past midnight reset
  return entry.amount;
}

function recordSpend(userAddress: string, amountUSD: number) {
  const key = userAddress.toLowerCase();
  const existing = dailySpend.get(key);
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);

  if (!existing || Date.now() > existing.resetAt) {
    dailySpend.set(key, { amount: amountUSD, resetAt: midnight.getTime() });
  } else {
    existing.amount += amountUSD;
  }
}

/** Whitelisted SoDEX testnet contract addresses */
const WHITELISTED_ADDRESSES = new Set([
  "0x0000000000000000000000000000000000000000", // placeholder
  "testnet-gw.sodex.dev", // symbolic — used for routing check
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

  const passed = checks.every((c) => c.passed);

  // Record spend only if passing
  if (passed) {
    recordSpend(intent.userAddress, intent.allocationUSD);
  }

  return {
    intentId: `${intent.strategyId}:${intent.userAddress}:${Date.now()}`,
    passed,
    checks,
    timestamp: now,
  };
}
