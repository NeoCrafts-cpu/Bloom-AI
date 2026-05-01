import type { FastifyInstance } from "fastify";
import { v4 as uuid } from "uuid";
import type { CopyTradeIntent, CopyTradeResult } from "@bloom-ai/types";
import { runSentinel } from "../agents/sentinel/index.js";
import { placeBatchSpotOrders } from "../services/sodex.js";
import { wsManager } from "../ws/manager.js";

export async function copyTradeRouter(app: FastifyInstance) {
  app.post<{ Body: CopyTradeIntent }>("/execute", async (req, reply) => {
    const intent = req.body;

    if (
      !intent.strategyId ||
      !intent.userAddress ||
      !intent.allocationUSD
    ) {
      return reply.code(400).send({
        error: "strategyId, userAddress and allocationUSD are required",
      });
    }

    // Default newsletterId if not provided
    if (!intent.newsletterId) intent.newsletterId = "nl-latest";

    // ── Step 1: Run Sentinel risk check ────────────────────────────────────
    const sentinelReport = runSentinel(intent);

    if (!sentinelReport.passed) {
      // Broadcast Sentinel trip event to frontend
      wsManager.broadcast({
        type: "SENTINEL_TRIP",
        payload: sentinelReport,
        timestamp: new Date().toISOString(),
      });

      const result: CopyTradeResult = {
        intentId: sentinelReport.intentId,
        sentinelStatus: "blocked",
        sentinelReason: sentinelReport.checks
          .filter((c) => !c.passed)
          .map((c) => c.message)
          .filter(Boolean)
          .join("; "),
        orders: [],
        totalExecutedUSD: 0,
        timestamp: new Date().toISOString(),
      };
      return reply.code(422).send({ data: result });
    }

    // ── Step 2: Build spot orders ───────────────────────────────────────────
    // In production: look up the SSI index assets and compute per-asset allocation
    // For demo: execute a single market buy on SoDEX testnet
    const orders = [
      {
        clOrdID: `bloom-${uuid().slice(0, 8)}`,
        side: 1 as const, // buy
        type: 2 as const, // market
        timeInForce: 2 as const, // IOC
        funds: intent.allocationUSD.toFixed(2), // DecimalString
      },
    ];

    // ── Step 3: Broadcast submission event ─────────────────────────────────
    wsManager.broadcast({
      type: "ORDER_SUBMITTED",
      payload: { intentId: sentinelReport.intentId, orders },
      timestamp: new Date().toISOString(),
    });

    // ── Step 4: Execute via SoDEX ───────────────────────────────────────────
    const fills = await placeBatchSpotOrders(
      0, // accountID — from user's connected wallet in production
      1, // symbolID — vBTC_vUSDC on testnet
      orders,
    );

    // ── Step 5: Broadcast fills ─────────────────────────────────────────────
    wsManager.broadcast({
      type: "ORDER_FILL",
      payload: { intentId: sentinelReport.intentId, fills },
      timestamp: new Date().toISOString(),
    });

    const result: CopyTradeResult = {
      intentId: sentinelReport.intentId,
      sentinelStatus: "passed",
      orders: fills.map((f) => ({
        orderId: uuid(),
        clOrdID: f.clOrdID,
        symbol: "vBTC_vUSDC",
        side: 1,
        fillPrice: 0, // populated by WS fill stream in production
        fillQuantity: 0,
        status: f.status === "FILLED" ? "filled" : "new",
        timestamp: new Date().toISOString(),
      })),
      totalExecutedUSD: intent.allocationUSD,
      timestamp: new Date().toISOString(),
    };

    return { data: result };
  });

  // Preview sentinel check without executing
  app.post<{ Body: CopyTradeIntent }>("/preview", async (req) => {
    const report = runSentinel(req.body);
    return { data: report };
  });
}
