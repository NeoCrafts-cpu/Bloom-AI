import type { FastifyInstance } from "fastify";
import { v4 as uuid } from "uuid";
import type { SSIIndex } from "@bloom-ai/types";
import { strategyStore } from "../agents/strategist/index.js";
import { getMarketSnapshots } from "../services/sosovalue.js";
import { marketEnvelope } from "../lib/marketMeta.js";

async function enrichWithLivePrices(strategies: SSIIndex[]): Promise<SSIIndex[]> {
  try {
    const markets = await getMarketSnapshots();
    const priceMap = Object.fromEntries(markets.data.map((m) => [m.symbol, m.price]));
    return strategies.map((s) => ({
      ...s,
      assets: s.assets.map((a) => ({
        ...a,
        currentPrice: priceMap[a.symbol] ?? a.currentPrice,
      })),
    }));
  } catch {
    return strategies;
  }
}

export async function strategyRouter(app: FastifyInstance) {
  app.get("/", async () => {
    const strategies = await enrichWithLivePrices(strategyStore.getAll());
    return marketEnvelope(strategies, {
      cachedAt: strategies.length > 0 ? Date.now() : null,
      isStale: false,
      message:
        strategies.length === 0
          ? "No strategies yet — run the agent pipeline to generate signals"
          : undefined,
    });
  });

  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const s = strategyStore.getById(req.params.id);
    if (!s) {
      return reply.code(404).send({
        error: "Strategy not found — run the agent pipeline first",
      });
    }
    const [enriched] = await enrichWithLivePrices([s]);
    return { data: enriched };
  });

  app.post<{ Body: Partial<SSIIndex> }>("/", async (req, reply) => {
    const body = req.body;
    if (!body.name || !body.assets?.length) {
      return reply.code(400).send({ error: "name and assets required" });
    }

    const newStrategy: SSIIndex = {
      id: `ssi-${uuid().slice(0, 8)}`,
      name: body.name,
      symbol: body.symbol ?? `BLOOM-${Date.now()}.ssi`,
      description: body.description ?? "",
      assets: body.assets,
      tvl: 0,
      dailyFee: 0.0001,
      createdAt: new Date().toISOString(),
      rebalancedAt: new Date().toISOString(),
    };

    strategyStore.add(newStrategy);
    return reply.code(201).send({ data: newStrategy });
  });
}
