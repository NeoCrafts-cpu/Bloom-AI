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

  // GET /performance — real session stats + live mark-to-market (no fabricated win rates)
  app.get("/performance", async () => {
    const { getAllMarkPrices, getMarkPriceCacheStatus } = await import("../services/markPriceCache.js");
    const { getPerpsMarkPrices } = await import("../services/sodex.js");
    const { getMarketSnapshots } = await import("../services/sosovalue.js");

    // Prefer WS marks; backfill from REST when cache is cold
    let marks = getAllMarkPrices();
    if (Object.keys(marks).length === 0) {
      const [perpsMarks, spot] = await Promise.all([
        getPerpsMarkPrices().catch(() => []),
        getMarketSnapshots().catch(() => null),
      ]);
      for (const m of perpsMarks) {
        const px = parseFloat(m.markPrice);
        if (Number.isFinite(px) && px > 0) {
          marks[m.symbol.replace(/^v/, "").split(/[_/-]/)[0].toUpperCase()] = px;
        }
      }
      for (const m of spot?.data ?? []) {
        if (m.price > 0) marks[m.symbol.toUpperCase()] = m.price;
      }
    }
    const mtmUpdated = tradeStore.updatePnlFromMarks(marks);
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
        mtmTrades: perf.mtmTrades,
        mtmUpdated,
        markCache: getMarkPriceCacheStatus(),
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
    const report = await runSentinel(req.body);
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
