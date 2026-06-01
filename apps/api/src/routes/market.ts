import type { FastifyInstance } from "fastify";
import {
  getMarketSnapshots,
  getETFFlows,
  getNewsSentiment,
  getETFSummaryHistory,
  getDefiLlamaTVL,
  getCurrencyList,
  getCurrencyIdBySymbol,
  getCurrencySnapshot,
  getCurrencyFundraising,
  getKlines,
} from "../services/sosovalue.js";
import {
  getSpotTickers,
  getOrderBook,
  getAccountState,
  getOrderHistory,
  getUserTrades,
  getSymbols,
  getSymbolName,
  getPerpsMarkPrices,
  getPerpsSymbols,
  getPerpsAccountState,
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

  // ── DeFi TVL ──────────────────────────────────────────────────────────────
  app.get("/defi-tvl", async (req, reply) => {
    try {
      const data = await getDefiLlamaTVL();
      return { data };
    } catch {
      reply.code(503);
      return { data: [], error: "DeFi TVL data temporarily unavailable" };
    }
  });

  // ── ETF Summary History ───────────────────────────────────────────────────
  app.get<{ Querystring: { symbol?: string; limit?: string } }>("/etf-history", async (req, reply) => {
    try {
      const symbol = req.query.symbol ?? "BTC";
      const limit  = Math.min(parseInt(req.query.limit ?? "30", 10), 90);
      const result = await getETFSummaryHistory(symbol, limit);
      return { data: result.data, meta: { cachedAt: result.cachedAt, isStale: result.isStale } };
    } catch {
      reply.code(503);
      return { data: [], error: "ETF history temporarily unavailable" };
    }
  });

  // ── Klines (SoDEX OHLCV, by base symbol e.g. "BTC") ──────────────────────
  app.get<{ Params: { symbol: string }; Querystring: { interval?: string; limit?: string } }>(
    "/klines/:symbol",
    async (req, reply) => {
      try {
        const base = req.params.symbol.toUpperCase();
        const sodexSymbol = await getSymbolName(base);
        if (!sodexSymbol) return reply.code(404).send({ error: `Symbol ${base} not found on SoDEX` });
        const interval = req.query.interval ?? "1h";
        const limit    = Math.min(parseInt(req.query.limit ?? "96", 10), 500);
        const data = await getKlines(sodexSymbol, interval, limit);
        return { data, meta: { symbol: sodexSymbol, interval, limit } };
      } catch {
        reply.code(503);
        return { data: [], error: "Klines temporarily unavailable" };
      }
    },
  );

  // ── Market Heatmap (top currencies with marketcap + 24h change) ──────────
  app.get("/heatmap", async (req, reply) => {
    try {
      // Primary: SoSoValue currency list + snapshot for top coins
      // Fallback: getMarketSnapshots() which has CoinGecko data with marketCap
      const snapshots = await getMarketSnapshots();
      // SoSoValue adds detail per currency_id; we enrich with it when available
      const currencyResult = await getCurrencyList().catch(() => null);
      const currencies = currencyResult?.data ?? [];

      // Enrich with per-coin SoSoValue snapshots (up to 10 coins)
      const enriched = await Promise.allSettled(
        snapshots.data.slice(0, 10).map(async (snap) => {
          const cur = currencies.find((c) => c.symbol.toUpperCase() === snap.symbol);
          if (cur) {
            const detail = await getCurrencySnapshot(cur.currency_id).catch(() => null);
            return {
              symbol: snap.symbol,
              price: snap.price,
              change24h: detail?.change_pct_24h ?? snap.change24h,
              marketCap: detail?.marketcap ?? snap.marketCap ?? 0,
              volume24h: detail?.turnover_24h ?? snap.volume24h,
              rank: detail?.marketcap_rank ?? 99,
            };
          }
          return {
            symbol: snap.symbol,
            price: snap.price,
            change24h: snap.change24h,
            marketCap: snap.marketCap ?? 0,
            volume24h: snap.volume24h,
            rank: 99,
          };
        }),
      );

      const data = enriched
        .filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer V> ? V : never> =>
          r.status === "fulfilled",
        )
        .map((r) => r.value);

      return { data };
    } catch {
      reply.code(503);
      return { data: [], error: "Heatmap data temporarily unavailable" };
    }
  });

  // ── VC Fundraising for a symbol ───────────────────────────────────────────
  app.get<{ Params: { symbol: string } }>("/fundraising/:symbol", async (req, reply) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const currencyId = await getCurrencyIdBySymbol(symbol);
      if (!currencyId) {
        return reply.code(404).send({ error: `Currency ${symbol} not found in SoSoValue` });
      }
      const result = await getCurrencyFundraising(currencyId);
      return { data: result.data, meta: { currencyId, cachedAt: result.cachedAt, isStale: result.isStale } };
    } catch {
      reply.code(503);
      return { data: null, error: "Fundraising data temporarily unavailable" };
    }
  });

  // ── Perps Mark Prices ─────────────────────────────────────────────────────
  app.get("/perps/mark-prices", async (req, reply) => {
    try {
      const data = await getPerpsMarkPrices();
      return { data };
    } catch {
      reply.code(503);
      return { data: [], error: "Perps mark prices temporarily unavailable" };
    }
  });

  // ── Perps Account State ───────────────────────────────────────────────────
  app.get<{ Params: { address: string } }>("/perps/:address/state", async (req, reply) => {
    try {
      const state = await getPerpsAccountState(req.params.address);
      if (!state) return reply.code(404).send({ data: null, error: "Perps account not found" });
      return { data: state };
    } catch {
      reply.code(503);
      return { data: null, error: "Perps account data temporarily unavailable" };
    }
  });

  // ── Perps Symbols ─────────────────────────────────────────────────────────
  app.get("/perps/symbols", async (req, reply) => {
    try {
      const data = await getPerpsSymbols();
      return { data };
    } catch {
      reply.code(503);
      return { data: [], error: "Perps symbols temporarily unavailable" };
    }
  });
}
