import type { FastifyInstance } from "fastify";
import { getMarketSnapshots, getETFFlows, getNewsSentiment } from "../services/sosovalue.js";
import {
  getSpotTickers,
  getOrderBook,
  getAccountState,
  getOrderHistory,
  getUserTrades,
  getSymbols,
} from "../services/sodex.js";

export async function marketRouter(app: FastifyInstance) {
  // ── Overview (all at once) ─────────────────────────────────────────────────
  app.get("/overview", async () => {
    const [markets, etf, sentiment] = await Promise.all([
      getMarketSnapshots(),
      getETFFlows(),
      getNewsSentiment(5),
    ]);
    return {
      data: { markets: markets.data, etf: etf.data, sentiment: sentiment.data },
      meta: { marketsCachedAt: markets.cachedAt, etfCachedAt: etf.cachedAt, newsCachedAt: sentiment.cachedAt },
    };
  });

  // ── Prices (SoDEX → CoinGecko fallback) ───────────────────────────────────
  app.get("/prices", async (req, reply) => {
    try {
      const result = await getMarketSnapshots();
      return { data: result.data, meta: { cachedAt: result.cachedAt, isStale: result.isStale } };
    } catch {
      reply.code(503);
      return { data: [], error: "Price data temporarily unavailable", meta: { cachedAt: null, isStale: false } };
    }
  });

  // ── ETF Flows ──────────────────────────────────────────────────────────────
  app.get("/etf-flows", async (req, reply) => {
    try {
      const result = await getETFFlows();
      return { data: result.data, meta: { cachedAt: result.cachedAt, isStale: result.isStale } };
    } catch {
      reply.code(503);
      return { data: [], error: "ETF data temporarily unavailable", meta: { cachedAt: null, isStale: false } };
    }
  });

  // ── News Sentiment ─────────────────────────────────────────────────────────
  app.get<{ Querystring: { limit?: string } }>("/sentiment", async (req, reply) => {
    const limit = Math.min(parseInt(req.query.limit ?? "12", 10), 50);
    try {
      const result = await getNewsSentiment(limit);
      return { data: result.data, meta: { cachedAt: result.cachedAt, isStale: result.isStale } };
    } catch {
      reply.code(503);
      return { data: [], error: "News data temporarily unavailable", meta: { cachedAt: null, isStale: false } };
    }
  });

  // ── ETF Summary ────────────────────────────────────────────────────────────
  app.get("/etf-summary", async (req, reply) => {
    try {
      const result = await getETFFlows();
      const flows = result.data;
      const totalNetInflow = flows.reduce((s, f) => s + f.netInflow, 0);
      const totalAUM = flows.reduce((s, f) => s + f.totalAUM, 0);
      return {
        data: {
          totalNetInflow,
          totalAUM,
          inflowCount: flows.filter((f) => f.netInflow > 0).length,
          outflowCount: flows.filter((f) => f.netInflow < 0).length,
          tickers: flows.length,
          date: flows[0]?.date ?? new Date().toISOString().slice(0, 10),
        },
        meta: { cachedAt: result.cachedAt, isStale: result.isStale },
      };
    } catch {
      reply.code(503);
      return { data: null, error: "ETF summary temporarily unavailable" };
    }
  });

  // ── SoDEX Tickers ─────────────────────────────────────────────────────────
  app.get("/sodex/tickers", async () => {
    const tickers = await getSpotTickers();
    return { data: tickers };
  });

  // ── SoDEX Symbols ─────────────────────────────────────────────────────────
  app.get("/sodex/symbols", async () => {
    const symbols = await getSymbols();
    return { data: symbols };
  });

  // ── SoDEX Orderbook ───────────────────────────────────────────────────────
  app.get<{ Params: { symbol: string }; Querystring: { limit?: string } }>(
    "/sodex/orderbook/:symbol",
    async (req) => {
      const ob = await getOrderBook(req.params.symbol, parseInt(req.query.limit ?? "20", 10));
      return { data: ob };
    },
  );

  // ── Account State (balances + open orders count) ───────────────────────────
  app.get<{ Params: { address: string } }>("/account/:address/state", async (req, reply) => {
    const state = await getAccountState(req.params.address);
    if (!state) {
      reply.code(404);
      return { data: null, error: "Account not found or SoDEX unavailable" };
    }
    return { data: state };
  });

  // ── Account Order History ─────────────────────────────────────────────────
  app.get<{ Params: { address: string }; Querystring: { symbol?: string; limit?: string } }>(
    "/account/:address/orders/history",
    async (req) => {
      const history = await getOrderHistory(
        req.params.address,
        req.query.symbol,
        parseInt(req.query.limit ?? "20", 10),
      );
      return { data: history };
    },
  );

  // ── Account Trades ────────────────────────────────────────────────────────
  app.get<{ Params: { address: string }; Querystring: { symbol?: string; limit?: string } }>(
    "/account/:address/trades",
    async (req) => {
      const trades = await getUserTrades(
        req.params.address,
        req.query.symbol,
        parseInt(req.query.limit ?? "20", 10),
      );
      return { data: trades };
    },
  );
}
