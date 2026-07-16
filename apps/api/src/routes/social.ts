import type { FastifyInstance } from "fastify";
import { tradeStore } from "../store/tradeStore.js";
import { strategyStore } from "../store/strategy.js";

/**
 * Social copy profiles + subscriber leaderboard (Phase 4 kickoff).
 * Ranked by verified executed notional — no fabricated win rates.
 */
export async function socialRouter(app: FastifyInstance) {
  app.get("/leaderboard", async () => {
    const history = tradeStore.getHistory(500);
    const byWallet: Record<
      string,
      { userAddress: string; trades: number; notionalUSD: number; liveTrades: number; strategies: Set<string> }
    > = {};

    for (const t of history) {
      if (t.sentinelStatus !== "passed") continue;
      const key = t.userAddress.toLowerCase();
      if (!byWallet[key]) {
        byWallet[key] = {
          userAddress: t.userAddress,
          trades: 0,
          notionalUSD: 0,
          liveTrades: 0,
          strategies: new Set(),
        };
      }
      byWallet[key].trades++;
      byWallet[key].notionalUSD += t.totalExecutedUSD;
      if (!t.simulated) byWallet[key].liveTrades++;
      byWallet[key].strategies.add(t.strategyId);
    }

    const leaderboard = Object.values(byWallet)
      .map((w) => ({
        userAddress: w.userAddress,
        trades: w.trades,
        notionalUSD: parseFloat(w.notionalUSD.toFixed(2)),
        liveTrades: w.liveTrades,
        strategyCount: w.strategies.size,
        verified: w.liveTrades > 0,
      }))
      .sort((a, b) => b.notionalUSD - a.notionalUSD)
      .slice(0, 50);

    return { data: leaderboard };
  });

  app.get<{ Params: { address: string } }>("/profiles/:address", async (req) => {
    const address = req.params.address.toLowerCase();
    const history = tradeStore.getHistory(200).filter(
      (t) => t.userAddress.toLowerCase() === address && t.sentinelStatus === "passed",
    );
    const strategies = strategyStore.getAll().filter((s) =>
      history.some((t) => t.strategyId === s.id),
    );

    return {
      data: {
        userAddress: req.params.address,
        trades: history.length,
        notionalUSD: parseFloat(history.reduce((s, t) => s + t.totalExecutedUSD, 0).toFixed(2)),
        simulatedTrades: history.filter((t) => t.simulated).length,
        liveTrades: history.filter((t) => !t.simulated).length,
        strategies: strategies.map((s) => ({ id: s.id, name: s.name, symbol: s.symbol })),
        recentTrades: history.slice(0, 20),
      },
    };
  });
}
