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
import { marketEnvelope, unavailableEnvelope } from "../lib/marketMeta.js";

export async function marketRouter(app: FastifyInstance) {
  // ── Overview (all at once) ─────────────────────────────────────────────────
  app.get("/overview", async () => {
    const [marketsResult, etfResult, sentimentResult] = await Promise.allSettled([
      getMarketSnapshots(),
      getETFFlows(),
      getNewsSentiment(5),
    ]);

    const markets =
      marketsResult.status === "fulfilled"
        ? marketsResult.value
        : { data: [], cachedAt: Date.now(), isStale: true };
    const etf =
      etfResult.status === "fulfilled"
        ? etfResult.value
        : { data: [], cachedAt: Date.now(), isStale: true };
    const sentiment =
      sentimentResult.status === "fulfilled"
        ? sentimentResult.value
        : { data: [], cachedAt: Date.now(), isStale: true };

    return {
      data: { markets: markets.data, etf: etf.data, sentiment: sentiment.data },
      meta: {
        markets: marketEnvelope(markets.data, {
          cachedAt: markets.cachedAt,
          isStale: markets.isStale,
        }).meta,
        etf: marketEnvelope(etf.data, { cachedAt: etf.cachedAt, isStale: etf.isStale }).meta,
        sentiment: marketEnvelope(sentiment.data, {
          cachedAt: sentiment.cachedAt,
          isStale: sentiment.isStale,
        }).meta,
      },
    };
  });

  // ── Prices (SoDEX → CoinGecko → seed fallback) ─────────────────────────────
  app.get("/prices", async () => {
    const result = await getMarketSnapshots();
    return marketEnvelope(result.data, {
      cachedAt: result.cachedAt,
      isStale: result.isStale,
      message: result.isStale && result.data.length > 0 ? "Serving cached or seed prices" : undefined,
    });
  });

  // ── ETF Flows ──────────────────────────────────────────────────────────────
  app.get("/etf-flows", async () => {
    const result = await getETFFlows();
    return marketEnvelope(result.data, {
      cachedAt: result.cachedAt,
      isStale: result.isStale,
      message:
        result.data.length === 0
          ? "ETF flow data unavailable from SoSoValue"
          : result.isStale
            ? "Serving cached ETF flows"
            : undefined,
    });
  });

  // ── News Sentiment ─────────────────────────────────────────────────────────
  app.get<{ Querystring: { limit?: string } }>("/sentiment", async (req) => {
    const limit = Math.min(parseInt(req.query.limit ?? "12", 10), 50);
    const result = await getNewsSentiment(limit);
    return marketEnvelope(result.data, {
      cachedAt: result.cachedAt,
      isStale: result.isStale,
      message:
        result.data.length === 0
          ? "News sentiment unavailable — optional panel"
          : result.isStale
            ? "Serving cached sentiment"
            : undefined,
    });
  });

  // ── ETF Summary ────────────────────────────────────────────────────────────
  app.get("/etf-summary", async () => {
    const result = await getETFFlows();
    const flows = result.data;
    const summary = {
      totalNetInflow: flows.reduce((s, f) => s + f.netInflow, 0),
      totalAUM: flows.reduce((s, f) => s + f.totalAUM, 0),
      inflowCount: flows.filter((f) => f.netInflow > 0).length,
      outflowCount: flows.filter((f) => f.netInflow < 0).length,
      tickers: flows.length,
      date: flows[0]?.date ?? new Date().toISOString().slice(0, 10),
    };
    return marketEnvelope(summary, {
      cachedAt: result.cachedAt,
      isStale: result.isStale,
      message: flows.length === 0 ? "ETF summary unavailable" : undefined,
    });
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
  app.get("/defi-tvl", async () => {
    const data = await getDefiLlamaTVL();
    return marketEnvelope(data, {
      cachedAt: data.length > 0 ? Date.now() : null,
      isStale: false,
      message: data.length === 0 ? "DeFi TVL temporarily unavailable" : undefined,
    });
  });

  // ── ETF Summary History ───────────────────────────────────────────────────
  app.get<{ Querystring: { symbol?: string; limit?: string } }>("/etf-history", async (req) => {
    const symbol = req.query.symbol ?? "BTC";
    const limit = Math.min(parseInt(req.query.limit ?? "30", 10), 90);
    const result = await getETFSummaryHistory(symbol, limit);
    return marketEnvelope(result.data, {
      cachedAt: result.cachedAt,
      isStale: result.isStale,
      message:
        result.data.length === 0
          ? `No ETF history available for ${symbol}`
          : result.isStale
            ? "Serving cached ETF history"
            : undefined,
    });
  });

  // ── Klines (SoDEX OHLCV, by base symbol e.g. "BTC") ──────────────────────
  app.get<{ Params: { symbol: string }; Querystring: { interval?: string; limit?: string } }>(
    "/klines/:symbol",
    async (req, reply) => {
      try {
        const base = req.params.symbol.toUpperCase();
        const sodexSymbol = await getSymbolName(base);
        if (!sodexSymbol) {
          return unavailableEnvelope([], `Symbol ${base} not found on SoDEX`);
        }
        const interval = req.query.interval ?? "1h";
        const limit = Math.min(parseInt(req.query.limit ?? "96", 10), 500);
        const data = await getKlines(sodexSymbol, interval, limit);
        return marketEnvelope(data, {
          cachedAt: data.length > 0 ? Date.now() : null,
          isStale: false,
          message: data.length === 0 ? "Klines temporarily unavailable" : undefined,
        });
      } catch {
        return unavailableEnvelope([], "Klines temporarily unavailable");
      }
    },
  );

  // ── Market Heatmap (top currencies with marketcap + 24h change) ──────────
  app.get("/heatmap", async () => {
    const snapshots = await getMarketSnapshots();
    const currencyResult = await getCurrencyList().catch(() => null);
    const currencies = currencyResult?.data ?? [];

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
      .filter((r): r is PromiseFulfilledResult<(typeof enriched)[0] extends PromiseFulfilledResult<infer V> ? V : never> =>
        r.status === "fulfilled",
      )
      .map((r) => r.value);

    return marketEnvelope(data, {
      cachedAt: snapshots.cachedAt,
      isStale: snapshots.isStale,
      message: data.length === 0 ? "Heatmap data temporarily unavailable" : undefined,
    });
  });

  // ── VC Fundraising for a symbol ───────────────────────────────────────────
  app.get<{ Params: { symbol: string } }>("/fundraising/:symbol", async (req) => {
    const symbol = req.params.symbol.toUpperCase();
    const currencyId = await getCurrencyIdBySymbol(symbol);
    if (!currencyId) {
      return marketEnvelope(null, {
        cachedAt: null,
        isStale: false,
        status: "empty",
        message: `No SoSoValue fundraising record for ${symbol}`,
      });
    }
    const result = await getCurrencyFundraising(currencyId);
    const hasRounds = (result.data?.fundraising_rounds?.length ?? 0) > 0;
    return {
      data: result.data,
      meta: {
        currencyId,
        cachedAt: result.cachedAt,
        isStale: result.isStale,
        status: hasRounds ? (result.isStale ? "stale" : "live") : "empty",
        message: hasRounds ? undefined : `No SoSoValue fundraising record for ${symbol}`,
      },
    };
  });

  // ── Perps Mark Prices ─────────────────────────────────────────────────────
  app.get("/perps/mark-prices", async () => {
    try {
      const data = await getPerpsMarkPrices();
      return marketEnvelope(data, { cachedAt: Date.now(), isStale: false });
    } catch {
      return unavailableEnvelope([], "Perps mark prices temporarily unavailable");
    }
  });

  // ── Perps Account State ───────────────────────────────────────────────────
  app.get<{ Params: { address: string } }>("/perps/:address/state", async (req, reply) => {
    try {
      const state = await getPerpsAccountState(req.params.address);
      if (!state) {
        reply.code(404);
        return { data: null, error: "Perps account not found" };
      }
      return { data: state };
    } catch {
      return unavailableEnvelope(null, "Perps account data temporarily unavailable");
    }
  });

  // ── Perps Symbols ─────────────────────────────────────────────────────────
  app.get("/perps/symbols", async () => {
    try {
      const data = await getPerpsSymbols();
      return marketEnvelope(data, { cachedAt: Date.now(), isStale: false });
    } catch {
      return unavailableEnvelope([], "Perps symbols temporarily unavailable");
    }
  });
}
