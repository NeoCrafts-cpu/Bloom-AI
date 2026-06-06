import type { FastifyInstance } from "fastify";
import type { CopyTradeIntent } from "@bloom-ai/types";
import { runSentinel } from "../agents/sentinel/index.js";
import { tradeStore } from "../store/tradeStore.js";
import { wsManager } from "../ws/manager.js";

export async function copyTradeRouter(app: FastifyInstance) {
  // GET /history — persisted trade log
  app.get("/history", async () => {
    return { data: tradeStore.getHistory(50) };
  });

  // GET /audit — persisted audit trail
  app.get("/audit", async () => {
    return { data: tradeStore.getAudit(50) };
  });

  // GET /performance — real session stats only (no fabricated win rates)
  app.get("/performance", async () => {
    const perf = tradeStore.getPerformance();
    return {
      data: {
        totalTrades: perf.totalTrades,
        blockedTrades: perf.blockedTrades,
        totalExecutedUSD: perf.totalExecutedUSD,
        verifiedPnlUSD: perf.verifiedPnlUSD,
        winRate: perf.winRate,
        maxDrawdownUSD: perf.maxDrawdownUSD,
        avgTradeUSD: perf.avgTradeUSD,
        simulatedTrades: perf.simulatedTrades,
        liveTrades: perf.liveTrades,
        byStrategy: perf.byStrategy,
      },
    };
  });

  // Legacy execute — redirect to /api/broker/execute
  app.post<{ Body: CopyTradeIntent }>("/execute", async (_req, reply) => {
    return reply.code(410).send({
      error: "Use POST /api/broker/execute for copy-trade execution",
      redirect: "/api/broker/execute",
    });
  });

  // Preview sentinel check without executing
  app.post<{ Body: CopyTradeIntent }>("/preview", async (req) => {
    const report = runSentinel(req.body);
    if (!report.passed) {
      tradeStore.recordSentinelBlock(report, {
        strategyId: req.body.strategyId,
        userAddress: req.body.userAddress,
      });
      wsManager.broadcast({
        type: "SENTINEL_TRIP",
        payload: report,
        timestamp: new Date().toISOString(),
      });
    }
    return { data: report };
  });
}
