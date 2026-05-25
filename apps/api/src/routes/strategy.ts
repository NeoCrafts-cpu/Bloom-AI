import type { FastifyInstance } from "fastify";
import { v4 as uuid } from "uuid";
import type { SSIIndex } from "@bloom-ai/types";

/** In-memory strategy store */
const strategies: SSIIndex[] = [
  {
    id: "ssi-mag7-003",
    name: "BLOOM-MAG7",
    symbol: "BLOOM-MAG7.ssi",
    description:
      "Crypto's magnificent seven — top 7 assets by institutional adoption, ETF inflows, and on-chain activity. Auto-rebalances when ETF flow dominance shifts.",
    assets: [
      { symbol: "BTC",  address: "0x0000000000000000000000000000000000000001", weight: 0.35, currentPrice: 97420 },
      { symbol: "ETH",  address: "0x0000000000000000000000000000000000000002", weight: 0.25, currentPrice: 3840 },
      { symbol: "SOL",  address: "0x0000000000000000000000000000000000000003", weight: 0.15, currentPrice: 198 },
      { symbol: "BNB",  address: "0x0000000000000000000000000000000000000004", weight: 0.10, currentPrice: 612 },
      { symbol: "AVAX", address: "0x0000000000000000000000000000000000000005", weight: 0.08, currentPrice: 38.9 },
      { symbol: "LINK", address: "0x0000000000000000000000000000000000000006", weight: 0.04, currentPrice: 17.8 },
      { symbol: "ARB",  address: "0x0000000000000000000000000000000000000007", weight: 0.03, currentPrice: 0.91 },
    ],
    tvl: 14_700_000,
    dailyFee: 0.0001,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    rebalancedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "ssi-rwa-001",
    name: "BLOOM-RWA",
    symbol: "BLOOM-RWA.ssi",
    description:
      "AI-curated Real World Asset index. Overweights tokenised T-bills, real estate tokens, and institutional-grade stablecoins based on macro rotation signals.",
    assets: [
      { symbol: "ONDO", address: "0x0000000000000000000000000000000000000008", weight: 0.35, currentPrice: 1.42 },
      { symbol: "MKR",  address: "0x0000000000000000000000000000000000000009", weight: 0.25, currentPrice: 2841 },
      { symbol: "USDC", address: "0x000000000000000000000000000000000000000a", weight: 0.20, currentPrice: 1.00 },
      { symbol: "LINK", address: "0x0000000000000000000000000000000000000006", weight: 0.20, currentPrice: 17.8 },
    ],
    tvl: 8_400_000,
    dailyFee: 0.0001,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    rebalancedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "ssi-defi-002",
    name: "BLOOM-DEFI",
    symbol: "BLOOM-DEFI.ssi",
    description:
      "High-beta DeFi protocol basket. Tracks top revenue-generating protocols with dynamic weighting based on 30-day protocol fee growth.",
    assets: [
      { symbol: "AAVE", address: "0x000000000000000000000000000000000000000b", weight: 0.30, currentPrice: 312 },
      { symbol: "GMX",  address: "0x000000000000000000000000000000000000000c", weight: 0.25, currentPrice: 47.2 },
      { symbol: "UNI",  address: "0x000000000000000000000000000000000000000d", weight: 0.25, currentPrice: 12.4 },
      { symbol: "COMP", address: "0x000000000000000000000000000000000000000e", weight: 0.20, currentPrice: 89.1 },
    ],
    tvl: 5_200_000,
    dailyFee: 0.0001,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    rebalancedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export async function strategyRouter(app: FastifyInstance) {
  app.get("/", async () => {
    return { data: strategies };
  });

  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const s = strategies.find((s) => s.id === req.params.id);
    if (!s) return reply.code(404).send({ error: "Not found" });
    return { data: s };
  });

  app.post<{ Body: Partial<SSIIndex> }>("/", async (req, reply) => {
    const body = req.body;
    if (!body.name || !body.assets?.length) {
      return reply.code(400).send({ error: "name and assets required" });
    }

    const newStrategy: SSIIndex = {
      id: uuid(),
      name: body.name,
      symbol: body.symbol ?? `BLOOM-${Date.now()}.ssi`,
      description: body.description ?? "",
      assets: body.assets,
      tvl: 0,
      dailyFee: 0.0001,
      createdAt: new Date().toISOString(),
      rebalancedAt: new Date().toISOString(),
    };

    strategies.unshift(newStrategy);
    return reply.code(201).send({ data: newStrategy });
  });
}
