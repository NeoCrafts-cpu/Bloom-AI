import type { FastifyInstance } from "fastify";
import { v4 as uuid } from "uuid";
import type { SSIIndex } from "@bloom-ai/types";
import { strategyStore, validateWeights } from "../store/strategy.js";
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
  app.post<{ Body: { idA: string; idB: string; notionalUSD?: number } }>("/compare", async (req, reply) => {
    const { idA, idB, notionalUSD } = req.body;
    if (!idA || !idB) return reply.code(400).send({ error: "idA and idB required" });
    const result = await strategyStore.compare(idA, idB, notionalUSD);
    if ("error" in result) return reply.code(404).send({ error: result.error });
    return { data: result };
  });

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
    const s = await strategyStore.getWithLivePrices(req.params.id);
    if (!s) {
      return reply.code(404).send({
        error: "Strategy not found — run the agent pipeline first",
      });
    }
    return {
      data: {
        strategy: s,
        history: strategyStore.getHistory(req.params.id),
        tradability: await strategyStore.getTradability(),
      },
    };
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

  app.put<{ Params: { id: string }; Body: Partial<SSIIndex> }>("/:id", async (req, reply) => {
    if (req.body.assets) {
      const validation = validateWeights(req.body.assets);
      if (!validation.valid) return reply.code(400).send({ error: validation.error });
    }
    const updated = strategyStore.update(req.params.id, {
      ...req.body,
      rebalancedAt: new Date().toISOString(),
    });
    if (!updated) return reply.code(404).send({ error: "Strategy not found" });
    return { data: updated };
  });

  app.post<{ Params: { id: string }; Body: { assets: SSIIndex["assets"]; reason: string; signalId?: string } }>(
    "/:id/rebalance",
    async (req, reply) => {
      if (!req.body.assets?.length || !req.body.reason?.trim()) {
        return reply.code(400).send({ error: "assets and reason required" });
      }
      const result = strategyStore.rebalance(req.params.id, req.body.assets, req.body.reason, req.body.signalId);
      if ("error" in result) return reply.code(400).send({ error: result.error });
      return { data: result };
    },
  );

  app.post<{ Params: { id: string } }>("/:id/publish", async (req, reply) => {
    const updated = strategyStore.update(req.params.id, {
      status: "published",
      rebalancedAt: new Date().toISOString(),
    });
    if (!updated) return reply.code(404).send({ error: "Strategy not found" });
    return { data: updated };
  });
}
