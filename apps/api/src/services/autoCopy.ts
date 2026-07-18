import type { AutoCopySubscription, CopyTradeIntent, SSIIndex } from "@bloom-ai/types";
import { verifyAutoCopyGrant } from "../signing/autoCopyAuth.js";
import { autoCopyStore } from "../store/autoCopyStore.js";
import { runSentinel } from "../agents/sentinel/index.js";
import { executeCopyTrade } from "../agents/broker/index.js";
import { tradeStore } from "../store/tradeStore.js";
import { config } from "../config.js";
import { wsManager } from "../ws/manager.js";

function grantStillValid(sub: AutoCopySubscription): { ok: boolean; error?: string } {
  const check = verifyAutoCopyGrant(
    {
      userAddress: sub.userAddress,
      maxAllocationUSD: sub.maxAllocationUSD,
      maxDailyUSD: sub.maxDailyUSD,
      maxSlippageBps: sub.maxSlippageBps,
      venue: sub.venue,
      expiresAt: sub.grantExpiresAt,
      nonce: sub.grantNonce,
    },
    sub.grantSignature,
  );
  if (!check.valid) return { ok: false, error: check.error };
  return { ok: true };
}

/**
 * After a new SSI is minted, fan out Auto-Copy for every enabled grant.
 */
export async function triggerAutoCopyForStrategy(
  strategy: SSIIndex,
  newsletterId?: string,
): Promise<{ ran: number; executed: number; blocked: number; skipped: number; errors: number }> {
  const subs = autoCopyStore.listEnabled();
  const summary = { ran: 0, executed: 0, blocked: 0, skipped: 0, errors: 0 };
  if (!subs.length) return summary;

  console.log(`[AutoCopy] Triggering for strategy ${strategy.id} — ${subs.length} subscriber(s)`);

  for (const sub of subs) {
    summary.ran++;
    const grant = grantStillValid(sub);
    if (!grant.ok) {
      summary.skipped++;
      autoCopyStore.recordRun({
        subscriptionId: sub.id,
        userAddress: sub.userAddress,
        strategyId: strategy.id,
        status: "skipped",
        message: grant.error ?? "Grant invalid",
        allocationUSD: sub.maxAllocationUSD,
      });
      if (/expired/i.test(grant.error ?? "")) {
        autoCopyStore.disable(sub.userAddress);
      }
      continue;
    }

    if (!autoCopyStore.canAfford(sub, sub.maxAllocationUSD)) {
      summary.skipped++;
      autoCopyStore.recordRun({
        subscriptionId: sub.id,
        userAddress: sub.userAddress,
        strategyId: strategy.id,
        status: "skipped",
        message: `Daily limit reached ($${sub.spentTodayUSD}/$${sub.maxDailyUSD})`,
        allocationUSD: sub.maxAllocationUSD,
      });
      continue;
    }

    const intent: CopyTradeIntent = {
      strategyId: strategy.id,
      newsletterId: newsletterId ?? "",
      userAddress: sub.userAddress,
      allocationUSD: sub.maxAllocationUSD,
      maxSlippageBps: sub.maxSlippageBps,
      venue: sub.venue,
      executionStyle: "market",
      // Grant signature proves user opted in; Sentinel mainnet gate checks presence
      userSignature: sub.grantSignature,
      deadline: sub.grantExpiresAt,
    };

    try {
      const sentinel = await runSentinel(intent);
      if (!sentinel.passed) {
        summary.blocked++;
        tradeStore.recordSentinelBlock(sentinel, {
          strategyId: intent.strategyId,
          userAddress: intent.userAddress,
        });
        wsManager.broadcast({
          type: "SENTINEL_TRIP",
          payload: { ...sentinel, source: "auto-copy" },
          timestamp: new Date().toISOString(),
        });
        autoCopyStore.recordRun({
          subscriptionId: sub.id,
          userAddress: sub.userAddress,
          strategyId: strategy.id,
          status: "blocked",
          message:
            sentinel.checks
              .filter((c) => !c.passed)
              .map((c) => c.message)
              .filter(Boolean)
              .join("; ") || "Sentinel blocked",
          allocationUSD: sub.maxAllocationUSD,
        });
        continue;
      }

      const result = await executeCopyTrade(intent);
      const simulated = !config.SODEX_API_PRIVATE_KEY;
      result.source = "auto-copy";
      tradeStore.recordExecution(intent, result, simulated);
      if (!simulated) {
        autoCopyStore.recordSpend(sub, result.totalExecutedUSD || sub.maxAllocationUSD);
      }
      summary.executed++;
      autoCopyStore.recordRun({
        subscriptionId: sub.id,
        userAddress: sub.userAddress,
        strategyId: strategy.id,
        status: "executed",
        message: simulated
          ? `Simulated ${result.orders.length} fills`
          : `Executed ${result.orders.length} orders for $${result.totalExecutedUSD.toFixed(2)}`,
        allocationUSD: sub.maxAllocationUSD,
        executedUSD: result.totalExecutedUSD,
        tradeId: result.intentId,
      });
      wsManager.broadcast({
        type: "ORDER_FILL",
        payload: { source: "auto-copy", strategyId: strategy.id, userAddress: sub.userAddress, result },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      summary.errors++;
      const message = (err as Error).message;
      tradeStore.recordError(
        { strategyId: strategy.id, userAddress: sub.userAddress },
        `Auto-Copy: ${message}`,
      );
      autoCopyStore.recordRun({
        subscriptionId: sub.id,
        userAddress: sub.userAddress,
        strategyId: strategy.id,
        status: "error",
        message,
        allocationUSD: sub.maxAllocationUSD,
      });
    }
  }

  console.log(`[AutoCopy] Done for ${strategy.id}:`, summary);
  return summary;
}
