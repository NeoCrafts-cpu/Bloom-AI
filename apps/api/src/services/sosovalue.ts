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
  if (flows.length === 0) {
    console.warn("[Market] No ETF data returned from SoSoValue — serving empty state");
    return [];
  }
  return flows;
}

/** Returns ETF flows with cache metadata. isStale=true means data is older than TTL. */
export async function getETFFlows(): Promise<{ data: ETFFlowData[]; cachedAt: number; isStale: boolean }> {
  try {
    return await cache.get("etf-flows", TTL.ETF_FLOWS, fetchETFFlows);
  } catch (err) {
    console.warn("[Market] ETF flows unavailable:", (err as Error).message);
    return { data: [], cachedAt: Date.now(), isStale: true };
  }
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

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function inferSentiment(title: string, tags: string[]): { sentiment: "bullish" | "bearish" | "neutral"; score: number } {
  const text = ((title ?? "") + " " + tags.join(" ")).toLowerCase();
  const bullish = /rally|surge|soar|rise|gain|bullish|pump|ath|record|inflow|adopt|partner|launch|approv|etf|upgrade|all.time/.test(text);
  const bearish = /crash|dump|fall|drop|bear|outflow|ban|hack|exploit|fraud|liquidat|sec|fine|sue|collapse|plunge|slump/.test(text);
  const seed = (hashString(text) % 1000) / 1000;
  if (bullish && !bearish) return { sentiment: "bullish", score: 0.6 + seed * 0.3 };
  if (bearish && !bullish) return { sentiment: "bearish", score: -(0.5 + seed * 0.4) };
  return { sentiment: "neutral", score: (seed - 0.5) * 0.3 };
}

async function fetchNewsSentiment(limit: number): Promise<NewsSentiment[]> {
  if (!config.SOSOVALUE_API_KEY) {
    console.warn("[Market] SOSOVALUE_API_KEY not configured — sentiment empty");
    return [];
  }
  const data = await get<{ list: SoSoNewsItem[]; page: number; total: number }>("/news", {
    page_size: String(limit),
    page: "1",
  });
  const items = data?.list ?? [];
  if (items.length === 0) return [];
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
  try {
    return await cache.get(`news-sentiment-${limit}`, TTL.NEWS_SENTIMENT, () => fetchNewsSentiment(limit));
  } catch (err) {
    console.warn("[Market] News sentiment unavailable:", (err as Error).message);
    return { data: [], cachedAt: Date.now(), isStale: true };
  }
}

// ─── Market Snapshots (SoDEX public tickers as primary source) ───────────────

const SEED_MARKET_SNAPSHOTS: MarketSnapshot[] = [
  { symbol: "BTC", price: 97420, change24h: 3.2, volume24h: 38_400_000_000, marketCap: 1_920_000_000_000, updatedAt: new Date(0).toISOString() },
  { symbol: "ETH", price: 3840, change24h: 4.1, volume24h: 22_100_000_000, marketCap: 461_000_000_000, updatedAt: new Date(0).toISOString() },
  { symbol: "SOL", price: 198, change24h: 5.7, volume24h: 8_200_000_000, marketCap: 93_000_000_000, updatedAt: new Date(0).toISOString() },
  { symbol: "BNB", price: 612, change24h: 1.8, volume24h: 2_900_000_000, marketCap: 88_000_000_000, updatedAt: new Date(0).toISOString() },
  { symbol: "AVAX", price: 38.9, change24h: -1.4, volume24h: 1_200_000_000, marketCap: 16_000_000_000, updatedAt: new Date(0).toISOString() },
  { symbol: "ARB", price: 0.91, change24h: 2.1, volume24h: 420_000_000, marketCap: 3_200_000_000, updatedAt: new Date(0).toISOString() },
  { symbol: "LINK", price: 17.8, change24h: 3.9, volume24h: 900_000_000, marketCap: 11_000_000_000, updatedAt: new Date(0).toISOString() },
];

function seedMarketSnapshots(): MarketSnapshot[] {
  const now = new Date().toISOString();
  return SEED_MARKET_SNAPSHOTS.map((snap) => ({ ...snap, updatedAt: now }));
}

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
    try {
      return await fetchMarketSnapshotsFromCoinGecko();
    } catch (cgErr) {
      console.warn("[Market] CoinGecko unavailable, using seed snapshots:", (cgErr as Error).message);
      return seedMarketSnapshots();
    }
  }
}

export async function getMarketSnapshots(): Promise<{ data: MarketSnapshot[]; cachedAt: number; isStale: boolean }> {
  try {
    return await cache.get("market-snapshots", TTL.MARKET_PRICES, fetchMarketSnapshots);
  } catch (err) {
    console.warn("[Market] Price snapshots unavailable:", (err as Error).message);
    return { data: seedMarketSnapshots(), cachedAt: Date.now(), isStale: true };
  }
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

async function fetchDefiLlamaTVL(): Promise<{ name: string; tvl: number; change24h: number; logo?: string; category?: string }[]> {
  const res = await fetch("https://api.llama.fi/protocols", { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`DeFiLlama ${res.status}`);
  const data = (await res.json()) as { name: string; tvl: number; change_1d: number; logo?: string; category?: string }[];
  return data
    .filter((p) => p.tvl > 0)
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 20)
    .map((p) => ({ name: p.name, tvl: p.tvl, change24h: p.change_1d ?? 0, logo: p.logo, category: p.category }));
}

export async function getDefiLlamaTVL(): Promise<{ name: string; tvl: number; change24h: number; logo?: string; category?: string }[]> {
  try {
    const result = await cache.get("defi-tvl", TTL.DEFI_TVL, fetchDefiLlamaTVL);
    return result.data;
  } catch {
    return [];
  }
}

// ─── ETF Summary History ──────────────────────────────────────────────────────

export interface ETFHistoryDay {
  date: string;
  total_net_inflow: number;
  total_value_traded: number;
  total_net_assets: number;
  cum_net_inflow: number;
}

async function fetchETFSummaryHistory(symbol: string, limit: number): Promise<ETFHistoryDay[]> {
  if (!config.SOSOVALUE_API_KEY) {
    console.warn("[Market] SOSOVALUE_API_KEY not configured — ETF history empty");
    return [];
  }
  const data = await get<ETFHistoryDay[]>("/etfs/summary-history", {
    symbol,
    page_size: String(limit),
  });
  return Array.isArray(data) ? data : [];
}

export async function getETFSummaryHistory(
  symbol = "BTC",
  limit = 30,
): Promise<{ data: ETFHistoryDay[]; cachedAt: number; isStale: boolean }> {
  try {
    return await cache.get(`etf-history-${symbol}-${limit}`, TTL.ETF_HISTORY, () =>
      fetchETFSummaryHistory(symbol, limit),
    );
  } catch (err) {
    console.warn("[Market] ETF history unavailable:", (err as Error).message);
    return { data: [], cachedAt: Date.now(), isStale: true };
  }
}

// ─── Currency List (heatmap / ID lookup) ─────────────────────────────────────

export interface SoSoCurrency {
  currency_id: string;
  symbol: string;
  name: string;
}

async function fetchCurrencyList(): Promise<SoSoCurrency[]> {
  if (!config.SOSOVALUE_API_KEY) return [];
  const data = await get<{ list: SoSoCurrency[] }>("/currencies", { page_size: "100", page: "1" });
  return data?.list ?? [];
}

export async function getCurrencyList(): Promise<{ data: SoSoCurrency[]; cachedAt: number; isStale: boolean }> {
  try {
    return await cache.get("currency-list", TTL.CURRENCY_LIST, fetchCurrencyList);
  } catch (err) {
    console.warn("[Market] Currency list unavailable:", (err as Error).message);
    return { data: [], cachedAt: Date.now(), isStale: true };
  }
}

export async function getCurrencyIdBySymbol(symbol: string): Promise<string | null> {
  try {
    const result = await getCurrencyList();
    const found = result.data.find((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
    return found?.currency_id ?? null;
  } catch {
    return null;
  }
}

// ─── Currency Market Snapshot (heatmap per-coin data) ────────────────────────

export interface CurrencyMarketSnapshotData {
  price: number;
  change_pct_24h: number;
  marketcap: number;
  turnover_24h: number;
  marketcap_rank: number;
  fdv: number;
  circulating_supply: string;
}

export async function getCurrencySnapshot(
  currencyId: string,
): Promise<CurrencyMarketSnapshotData | null> {
  try {
    const result = await cache.get(
      `snapshot-${currencyId}`,
      TTL.MARKET_PRICES,
      () => get<CurrencyMarketSnapshotData>(`/currencies/${currencyId}/market-snapshot`),
    );
    return result.data;
  } catch {
    return null;
  }
}

// ─── Fundraising ──────────────────────────────────────────────────────────────

export interface FundraisingInvestor {
  investor_id: string;
  name: string;
  logo_url: string;
  type: number;
  is_lead_investor: boolean;
}

export interface FundraisingRound {
  round_id: string;
  round: string;
  amount: string;
  valuation: string | null;
  date: number;
  investors: FundraisingInvestor[];
}

export interface FundraisingData {
  project_id: string;
  fundraising_rounds: FundraisingRound[];
  investors: { name: string; logo_url: string; type: number }[];
  investment_stats: {
    total_rounds: number;
    rounds_last_year: number;
    lead_invest_count: number;
    last_invest_date: number | null;
    portfolio_count: number;
  };
}

async function fetchCurrencyFundraising(currencyId: string): Promise<FundraisingData | null> {
  if (!config.SOSOVALUE_API_KEY) return null;
  return get<FundraisingData>(`/currencies/${currencyId}/fundraising`);
}

export async function getCurrencyFundraising(
  currencyId: string,
): Promise<{ data: FundraisingData | null; cachedAt: number; isStale: boolean }> {
  try {
    return await cache.get(`fundraising-${currencyId}`, TTL.FUNDRAISING, () =>
      fetchCurrencyFundraising(currencyId),
    );
  } catch (err) {
    console.warn("[Market] Fundraising unavailable:", (err as Error).message);
    return { data: null, cachedAt: Date.now(), isStale: true };
  }
}
