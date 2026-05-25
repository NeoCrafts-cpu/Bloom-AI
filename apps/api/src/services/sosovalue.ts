import type { ETFFlowData, NewsSentiment, MarketSnapshot } from "@bloom-ai/types";
import { config } from "../config.js";
import { cache, TTL } from "../lib/cache.js";

const BASE = config.SOSOVALUE_BASE_URL;
const HEADERS = {
  "x-soso-api-key": config.SOSOVALUE_API_KEY,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), { headers: HEADERS, signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SoSoValue API ${path} → ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { code: number; data: T; error?: string; message?: string };
  if (json.code !== 0 && json.code !== 200) {
    throw new Error(`SoSoValue API error ${json.code}: ${json.error ?? json.message}`);
  }
  return json.data;
}

// ─── ETF Flows ────────────────────────────────────────────────────────────────

const ETF_TICKERS = ["IBIT", "FBTC", "BITB", "GBTC", "HODL", "ETHA", "FETH", "ETHV"];

interface SoSoETFSnapshot {
  date: string;
  ticker: string;
  net_inflow: number;
  net_assets: number;
  mkt_price: number;
  value_traded: number;
  volume: number;
  cum_inflow: number;
  sponsor_fee: number;
  prem_dsc: number;
}

async function fetchETFFlows(): Promise<ETFFlowData[]> {
  if (!config.SOSOVALUE_API_KEY) throw new Error("SOSOVALUE_API_KEY not configured");
  const results = await Promise.allSettled(
    ETF_TICKERS.map((ticker) => get<SoSoETFSnapshot>(`/etfs/${ticker}/market-snapshot`)),
  );
  const flows: ETFFlowData[] = results
    .filter((r): r is PromiseFulfilledResult<SoSoETFSnapshot> => r.status === "fulfilled" && r.value != null)
    .map((r) => ({
      date: r.value.date ?? new Date().toISOString().slice(0, 10),
      ticker: r.value.ticker,
      netInflow: r.value.net_inflow ?? 0,
      totalAUM: r.value.net_assets ?? 0,
      change24h: 0,
    }));
  if (flows.length === 0) throw new Error("No ETF data returned from SoSoValue");
  return flows;
}

/** Returns ETF flows with cache metadata. isStale=true means data is older than TTL. */
export async function getETFFlows(): Promise<{ data: ETFFlowData[]; cachedAt: number; isStale: boolean }> {
  return cache.get("etf-flows", TTL.ETF_FLOWS, fetchETFFlows);
}

// ─── News Sentiment ───────────────────────────────────────────────────────────

interface SoSoNewsItem {
  id: string;
  title: string;
  content: string;
  summary: string;
  author: string;
  nick_name: string;
  release_time: number;
  tags: string[];
  matched_currencies: { id: string; full_name: string; name: string }[];
}

function inferSentiment(title: string, tags: string[]): { sentiment: "bullish" | "bearish" | "neutral"; score: number } {
  const text = ((title ?? "") + " " + tags.join(" ")).toLowerCase();
  const bullish = /rally|surge|soar|rise|gain|bullish|pump|ath|record|inflow|adopt|partner|launch|approv|etf|upgrade|all.time/.test(text);
  const bearish = /crash|dump|fall|drop|bear|outflow|ban|hack|exploit|fraud|liquidat|sec|fine|sue|collapse|plunge|slump/.test(text);
  if (bullish && !bearish) return { sentiment: "bullish", score: 0.6 + Math.random() * 0.3 };
  if (bearish && !bullish) return { sentiment: "bearish", score: -(0.5 + Math.random() * 0.4) };
  return { sentiment: "neutral", score: (Math.random() - 0.5) * 0.3 };
}

async function fetchNewsSentiment(limit: number): Promise<NewsSentiment[]> {
  if (!config.SOSOVALUE_API_KEY) throw new Error("SOSOVALUE_API_KEY not configured");
  const data = await get<{ list: SoSoNewsItem[]; page: number; total: number }>("/news", {
    page_size: String(limit),
    page: "1",
  });
  const items = data?.list ?? [];
  if (items.length === 0) throw new Error("No news returned from SoSoValue");
  return items.map((item) => {
    const { sentiment, score } = inferSentiment(item.title, item.tags ?? []);
    return {
      id: item.id,
      title: item.title || item.summary || "Market Update",
      summary: (item.content ?? item.summary ?? "").replace(/<[^>]+>/g, "").slice(0, 200),
      sentiment,
      score,
      publishedAt: new Date(item.release_time).toISOString(),
      source: item.nick_name || item.author || "SoSoValue",
      tags: item.tags ?? [],
    };
  });
}

export async function getNewsSentiment(
  limit = 10,
): Promise<{ data: NewsSentiment[]; cachedAt: number; isStale: boolean }> {
  return cache.get(`news-sentiment-${limit}`, TTL.NEWS_SENTIMENT, () => fetchNewsSentiment(limit));
}

// ─── Market Snapshots (SoDEX public tickers as primary source) ───────────────

const VTOKEN_MAP: Record<string, string> = {
  vBTC: "BTC", vETH: "ETH", vSOL: "SOL", vBNB: "BNB",
  vAVAX: "AVAX", vLINK: "LINK", vARB: "ARB",
};

async function fetchMarketSnapshotsFromSodex(): Promise<MarketSnapshot[]> {
  const res = await fetch(`${config.SODEX_SPOT_URL}/markets/tickers`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`SoDEX tickers ${res.status}`);
  const json = (await res.json()) as {
    code: number;
    data: { symbol: string; lastPrice: string; priceChangePercent: string; volume: string; quoteVolume?: string }[];
  };
  const snapshots: MarketSnapshot[] = [];
  for (const ticker of json.data ?? []) {
    const base = ticker.symbol.split("_")[0];
    const standardSymbol = VTOKEN_MAP[base];
    if (!standardSymbol) continue;
    const price = parseFloat(ticker.lastPrice);
    if (!price || isNaN(price)) continue;
    snapshots.push({
      symbol: standardSymbol,
      price,
      change24h: parseFloat(ticker.priceChangePercent ?? "0"),
      volume24h: parseFloat(ticker.quoteVolume ?? ticker.volume ?? "0"),
      marketCap: 0,
      updatedAt: new Date().toISOString(),
    });
  }
  if (snapshots.length === 0) throw new Error("No usable tickers from SoDEX");
  return snapshots;
}

async function fetchMarketSnapshotsFromCoinGecko(): Promise<MarketSnapshot[]> {
  const ids = "bitcoin,ethereum,solana,bnb,avalanche-2,chainlink,arbitrum";
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.COINGECKO_API_KEY) headers["x-cg-demo-api-key"] = config.COINGECKO_API_KEY;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const raw = (await res.json()) as Record<
    string,
    { usd: number; usd_24h_change: number; usd_market_cap: number; usd_24h_vol: number }
  >;
  const symbolMap: Record<string, string> = {
    bitcoin: "BTC", ethereum: "ETH", solana: "SOL", bnb: "BNB",
    "avalanche-2": "AVAX", chainlink: "LINK", arbitrum: "ARB",
  };
  return Object.entries(raw).map(([id, d]) => ({
    symbol: symbolMap[id] ?? id.toUpperCase(),
    price: d.usd,
    change24h: d.usd_24h_change,
    volume24h: d.usd_24h_vol,
    marketCap: d.usd_market_cap,
    updatedAt: new Date().toISOString(),
  }));
}

async function fetchMarketSnapshots(): Promise<MarketSnapshot[]> {
  try {
    return await fetchMarketSnapshotsFromSodex();
  } catch (err) {
    console.warn("[Market] SoDEX tickers unavailable, falling back to CoinGecko:", (err as Error).message);
    return fetchMarketSnapshotsFromCoinGecko();
  }
}

export async function getMarketSnapshots(): Promise<{ data: MarketSnapshot[]; cachedAt: number; isStale: boolean }> {
  return cache.get("market-snapshots", TTL.MARKET_PRICES, fetchMarketSnapshots);
}

// ─── Klines (SoDEX OHLCV) ────────────────────────────────────────────────────

export async function getKlines(
  symbol: string,
  interval = "1h",
  limit = 100,
): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
  try {
    const res = await fetch(
      `${config.SODEX_SPOT_URL}/markets/${symbol}/klines?interval=${interval}&limit=${limit}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { code: number; data: [number, string, string, string, string, string][] };
    return (json.data ?? []).map(([t, o, h, l, c, v]) => ({
      time: t,
      open: parseFloat(o),
      high: parseFloat(h),
      low: parseFloat(l),
      close: parseFloat(c),
      volume: parseFloat(v),
    }));
  } catch {
    return [];
  }
}

// ─── CryptoPanic News ─────────────────────────────────────────────────────────

async function fetchLatestCryptoNews(): Promise<{ title: string; url: string; source: string; publishedAt: string }[]> {
  const baseUrl = config.CRYPTOPANIC_API_KEY
    ? `https://cryptopanic.com/api/v1/posts/?auth_token=${config.CRYPTOPANIC_API_KEY}&public=true&kind=news&filter=hot`
    : "https://cryptopanic.com/api/v1/posts/?public=true&kind=news&filter=hot";
  const res = await fetch(baseUrl, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CryptoPanic ${res.status}`);
  const json = (await res.json()) as {
    results: { title: string; url: string; source: { title: string }; published_at: string }[];
  };
  return json.results.slice(0, 10).map((r) => ({
    title: r.title,
    url: r.url,
    source: r.source.title,
    publishedAt: r.published_at,
  }));
}

export async function getLatestCryptoNews(): Promise<{ title: string; url: string; source: string; publishedAt: string }[]> {
  try {
    const result = await cache.get("crypto-news", TTL.CRYPTO_NEWS, fetchLatestCryptoNews);
    return result.data;
  } catch {
    return [];
  }
}

// ─── DeFiLlama TVL ───────────────────────────────────────────────────────────

async function fetchDefiLlamaTVL(): Promise<{ name: string; tvl: number; change24h: number }[]> {
  const res = await fetch("https://api.llama.fi/protocols", { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`DeFiLlama ${res.status}`);
  const data = (await res.json()) as { name: string; tvl: number; change_1d: number }[];
  return data
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 10)
    .map((p) => ({ name: p.name, tvl: p.tvl, change24h: p.change_1d ?? 0 }));
}

export async function getDefiLlamaTVL(): Promise<{ name: string; tvl: number; change24h: number }[]> {
  try {
    const result = await cache.get("defi-tvl", TTL.DEFI_TVL, fetchDefiLlamaTVL);
    return result.data;
  } catch {
    return [];
  }
}
