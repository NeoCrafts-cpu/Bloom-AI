import { config } from "../config.js";
import { cache, TTL } from "../lib/cache.js";
import { getNonce } from "../signing/nonceManager.js";
import { buildTypedSignature } from "../signing/eip712.js";
import type { SpotOrderItem, PerpsOrderItem } from "@bloom-ai/types";
import { parseSodexKlines, parseSodexTickerChangePct, parseSodexTickerPrice, parseSodexTickerVolume } from "../lib/sodexParse.js";
import { ethers } from "ethers";

const SPOT = config.SODEX_SPOT_URL;
const PERPS = config.SODEX_PERPS_URL;

interface SodexResponse<T> {
  code: number;
  timestamp: number;
  error?: string;
  data?: T;
}

async function publicGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`SoDEX GET ${url} → ${res.status}`);
  const json = (await res.json()) as SodexResponse<T>;
  if (json.code !== 0 && json.code !== 200) {
    throw new Error(`SoDEX error ${json.code}: ${json.error}`);
  }
  return json.data as T;
}

async function signedPost<T>(
  url: string,
  domainName: "spot" | "futures",
  actionType: string,
  params: Record<string, unknown>,
): Promise<T> {
  if (!config.SODEX_API_PRIVATE_KEY || !config.SODEX_API_KEY_NAME) {
    throw new Error("SODEX_API_PRIVATE_KEY and SODEX_API_KEY_NAME are required for live SoDEX execution");
  }
  const signingAddress = config.SODEX_API_KEY_ADDRESS || new ethers.Wallet(config.SODEX_API_PRIVATE_KEY).address;
  const nonce = await getNonce(signingAddress);
  const payload = { type: actionType, params };
  const { typedSig } = await buildTypedSignature(payload, nonce, domainName);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": config.SODEX_API_KEY_NAME,
      "X-API-Sign": typedSig,
      "X-API-Nonce": String(nonce),
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(15000),
  });

  const json = (await res.json()) as SodexResponse<T>;
  if (json.code !== 0 && json.code !== 200) {
    throw new Error(`SoDEX ${actionType} error ${json.code}: ${json.error}`);
  }
  return json.data as T;
}

// ─── Symbol types ─────────────────────────────────────────────────────────────

export interface SodexSymbol {
  symbol: string;
  symbolID: number;
  baseAsset: string;
  quoteAsset: string;
  minNotional: string;
  pricePrecision: number;
  quantityPrecision: number;
  tickSize: string;
  stepSize: string;
  minQuantity: string;
  lastTradePrice: string;
}

// ─── Public Market Data ───────────────────────────────────────────────────────

export interface SpotTicker {
  symbol: string;
  lastPrice?: string;
  lastPx?: string;
  priceChangePercent?: string;
  changePct?: number;
  volume?: string;
  quoteVolume?: string;
  q?: string;
  bidPrice?: string;
  bidPx?: string;
  askPrice?: string;
  askPx?: string;
}

/** Normalized ticker fields for internal use */
export function normalizeSpotTicker(ticker: SpotTicker) {
  return {
    symbol: ticker.symbol,
    lastPrice: parseSodexTickerPrice(ticker),
    change24h: parseSodexTickerChangePct(ticker),
    volume24h: parseSodexTickerVolume(ticker),
  };
}

export async function getSpotKlines(
  symbol: string,
  interval = "1h",
  limit = 100,
): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
  try {
    const res = await fetch(
      `${SPOT}/markets/${symbol}/klines?interval=${interval}&limit=${limit}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) {
      console.warn(`[SoDEX] klines ${symbol} HTTP ${res.status}`);
      return [];
    }
    const json = (await res.json()) as { code: number; data: unknown };
    const bars = parseSodexKlines(json.data);
    if (bars.length === 0 && Array.isArray(json.data) && json.data.length > 0) {
      console.warn(`[SoDEX] klines ${symbol} returned rows but none parsed`);
    }
    return bars;
  } catch (err) {
    console.warn(`[SoDEX] klines ${symbol} failed:`, (err as Error).message);
    return [];
  }
}

async function fetchSpotTickers(): Promise<SpotTicker[]> {
  return publicGet<SpotTicker[]>(`${SPOT}/markets/tickers`);
}

export async function getSpotTickers(): Promise<SpotTicker[]> {
  try {
    const result = await cache.get("sodex-tickers", TTL.MARKET_PRICES, fetchSpotTickers);
    return result.data;
  } catch {
    return [];
  }
}

export async function getOrderBook(
  symbol: string,
  limit = 20,
): Promise<{ bids: [string, string][]; asks: [string, string][] }> {
  try {
    const result = await cache.get(
      `sodex-orderbook-${symbol}-${limit}`,
      TTL.SODEX_ORDERBOOK,
      () => publicGet<{ bids: [string, string][]; asks: [string, string][] }>(
        `${SPOT}/markets/${symbol}/orderbook?limit=${limit}`,
      ),
    );
    return result.data;
  } catch {
    return { bids: [], asks: [] };
  }
}

async function fetchSymbols(): Promise<SodexSymbol[]> {
  return publicGet<SodexSymbol[]>(`${SPOT}/markets/symbols`);
}

export async function getSymbols(): Promise<SodexSymbol[]> {
  try {
    const result = await cache.get("sodex-symbols", TTL.SODEX_SYMBOLS, fetchSymbols);
    return result.data;
  } catch {
    return [];
  }
}

/** Build a map from base asset (e.g. "BTC") to symbolID */
export async function getSymbolIdMap(): Promise<Record<string, number>> {
  const symbols = await getSymbols();
  const map: Record<string, number> = {};
  for (const s of symbols) {
    if (s.quoteAsset === "vUSDC" || s.quoteAsset === "USDC") {
      map[s.baseAsset.replace(/^v/, "")] = s.symbolID;
    }
  }
  return map;
}

/** Static map of known SoDEX Testnet spot symbols (used as primary lookup) */
const STATIC_SYMBOL_MAP: Record<string, string> = {
  BTC:  "vBTC_vUSDC",
  ETH:  "vETH_vUSDC",
  SOL:  "vSOL_vUSDC",
  BNB:  "vBNB_vUSDC",
  AVAX: "vAVAX_vUSDC",
  ARB:  "vARB_vUSDC",
  OP:   "vOP_vUSDC",
};

/** Get the SoDEX spot symbol name for a base asset (e.g. "BTC" → "vBTC_vUSDC") */
export async function getSymbolName(baseAsset: string): Promise<string | null> {
  const upper = baseAsset.toUpperCase();

  // 1. Fast static lookup — always works even if SoDEX symbols endpoint is slow/unavailable
  if (STATIC_SYMBOL_MAP[upper]) return STATIC_SYMBOL_MAP[upper];

  // 2. Dynamic lookup from the live symbols endpoint
  const symbols = await getSymbols();
  const found = symbols.find(
    (s) =>
      (s.baseAsset === `v${upper}` || s.baseAsset === upper) &&
      (s.quoteAsset === "vUSDC" || s.quoteAsset === "USDC"),
  );
  return found?.symbol ?? null;
}

export async function getRecentTrades(symbol: string, limit = 20) {
  try {
    return await publicGet<{ price: string; quantity: string; side: number; timestamp: number }[]>(
      `${SPOT}/markets/${symbol}/trades?limit=${limit}`,
    );
  } catch {
    return [];
  }
}

// ─── Account Data ─────────────────────────────────────────────────────────────

export interface AccountBalance {
  asset: string;
  available: string;
  locked: string;
  total: string;
}

export interface AccountState {
  accountID: number;
  balances: AccountBalance[];
  openOrdersCount: number;
}

export async function getAccountState(userAddress: string): Promise<AccountState | null> {
  try {
    const result = await cache.get(
      `sodex-account-${userAddress}`,
      TTL.ACCOUNT_STATE,
      async () => {
        const data = await publicGet<{
          accountID: number;
          balances: AccountBalance[];
          openOrders: unknown[];
        }>(`${SPOT}/accounts/${userAddress}/state`);
        return {
          accountID: data.accountID,
          balances: data.balances ?? [],
          openOrdersCount: (data.openOrders ?? []).length,
        } as AccountState;
      },
    );
    return result.data;
  } catch (err) {
    console.warn(`[SoDEX] getAccountState failed for ${userAddress}:`, err);
    return null;
  }
}

export async function getAccountBalances(userAddress: string): Promise<AccountBalance[]> {
  const state = await getAccountState(userAddress);
  return state?.balances ?? [];
}

export async function getOpenOrders(userAddress: string, symbol?: string) {
  try {
    const url = `${SPOT}/accounts/${userAddress}/orders${symbol ? `?symbol=${symbol}` : ""}`;
    return await publicGet<unknown[]>(url);
  } catch {
    return [];
  }
}

export async function getOrderHistory(userAddress: string, symbol?: string, limit = 20) {
  try {
    const url = `${SPOT}/accounts/${userAddress}/orders/history?limit=${limit}${symbol ? `&symbol=${symbol}` : ""}`;
    return await publicGet<unknown[]>(url);
  } catch {
    return [];
  }
}

export async function getUserTrades(userAddress: string, symbol?: string, limit = 20) {
  try {
    const url = `${SPOT}/accounts/${userAddress}/trades?limit=${limit}${symbol ? `&symbol=${symbol}` : ""}`;
    return await publicGet<unknown[]>(url);
  } catch {
    return [];
  }
}

// ─── Signed Trading ───────────────────────────────────────────────────────────

export async function placeBatchSpotOrders(
  accountID: number,
  symbolID: number,
  orders: SpotOrderItem[],
): Promise<{ clOrdID: string; status: string; message?: string }[]> {
  if (!config.SODEX_API_PRIVATE_KEY || !config.SODEX_API_KEY_NAME) {
    // Simulation mode — no private key configured
    console.warn("[Broker] SODEX_API_PRIVATE_KEY not set — simulating order fills");
    return orders.map((o) => ({
      clOrdID: o.clOrdID,
      status: "FILLED",
      message: "Simulated — configure SODEX_API_PRIVATE_KEY and SODEX_API_KEY_NAME for live execution",
    }));
  }

  return signedPost<{ clOrdID: string; status: string; message?: string }[]>(
    `${SPOT}/trade/orders/batch`,
    "spot",
    "newOrder",
    { accountID, symbolID, orders },
  );
}

export async function placeBatchPerpsOrders(
  accountID: number,
  symbolID: number,
  orders: PerpsOrderItem[],
) {
  if (!config.SODEX_API_PRIVATE_KEY || !config.SODEX_API_KEY_NAME) {
    return orders.map((o) => ({
      clOrdID: o.clOrdID,
      status: "FILLED",
      message: "Simulated — configure SODEX_API_PRIVATE_KEY and SODEX_API_KEY_NAME for live execution",
    }));
  }

  return signedPost(
    `${PERPS}/trade/orders/batch`,
    "futures",
    "newOrder",
    { accountID, symbolID, orders },
  );
}

export async function cancelOrder(
  accountID: number,
  symbolID: number,
  clOrdID: string,
  isPerps = false,
) {
  if (!config.SODEX_API_PRIVATE_KEY || !config.SODEX_API_KEY_NAME) {
    return { clOrdID, status: "CANCELLED", message: "Simulated" };
  }
  const base = isPerps ? PERPS : SPOT;
  return signedPost(
    `${base}/trade/orders/batch`,
    isPerps ? "futures" : "spot",
    "cancelOrder",
    { accountID, symbolID, orders: [{ clOrdID }] },
  );
}

/** TWAP order (spot or perps) — requires SODEX_ENABLE_TWAP=1 for live path callers */
export async function placeTwapOrder(
  accountID: number,
  symbolID: number,
  params: {
    clOrdID: string;
    side: number;
    quantity: string;
    durationSec: number;
    isPerps?: boolean;
  },
) {
  if (!config.SODEX_API_PRIVATE_KEY || !config.SODEX_API_KEY_NAME) {
    return { clOrdID: params.clOrdID, status: "SUBMITTED", message: "Simulated TWAP" };
  }
  if (!config.SODEX_ENABLE_TWAP) {
    throw new Error("TWAP disabled — set SODEX_ENABLE_TWAP=1");
  }
  const isPerps = !!params.isPerps;
  return signedPost(
    `${isPerps ? PERPS : SPOT}/trade/twap`,
    isPerps ? "futures" : "spot",
    "newTwapOrder",
    {
      accountID,
      symbolID,
      clOrdID: params.clOrdID,
      side: params.side,
      quantity: params.quantity,
      duration: params.durationSec,
    },
  );
}

export async function updatePerpsLeverage(accountID: number, symbolID: number, leverage: number) {
  if (!config.SODEX_API_PRIVATE_KEY || !config.SODEX_API_KEY_NAME) {
    return { accountID, symbolID, leverage, status: "SIMULATED" };
  }
  return signedPost(`${PERPS}/trade/leverage`, "futures", "updateLeverage", {
    accountID,
    symbolID,
    leverage,
  });
}

// ─── Perps Market Data ────────────────────────────────────────────────────────

export interface PerpsMarkPrice {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  fundingRate: string;
  nextFundingTime: number;
}

export async function getPerpsMarkPrices(): Promise<PerpsMarkPrice[]> {
  try {
    const result = await cache.get("perps-mark-prices", TTL.MARK_PRICES, () =>
      publicGet<PerpsMarkPrice[]>(`${PERPS}/markets/mark-prices`),
    );
    return result.data ?? [];
  } catch {
    return [];
  }
}

export interface PerpsSymbolInfo {
  symbol: string;
  symbolID: number;
  baseAsset: string;
  quoteAsset: string;
  maxLeverage: number;
  pricePrecision: number;
  quantityPrecision: number;
}

export async function getPerpsSymbols(): Promise<PerpsSymbolInfo[]> {
  try {
    const result = await cache.get("perps-symbols", TTL.SODEX_SYMBOLS, () =>
      publicGet<PerpsSymbolInfo[]>(`${PERPS}/markets/symbols`),
    );
    return result.data ?? [];
  } catch {
    return [];
  }
}

// ─── Perps Account ────────────────────────────────────────────────────────────

export interface PerpsPosition {
  symbol: string;
  positionSide: number; // 1=long, 2=short
  quantity: string;
  entryPrice: string;
  markPrice: string;
  unrealizedPnl: string;
  leverage: number;
  marginMode: string;
  liquidationPrice: string;
}

export interface PerpsBalance {
  asset: string;
  available: string;
  locked: string;
  total: string;
  unrealizedPnl: string;
  marginBalance: string;
}

export interface PerpsAccountState {
  accountID: number;
  balances: PerpsBalance[];
  positions: PerpsPosition[];
  openOrdersCount: number;
}

export async function getPerpsAccountState(userAddress: string): Promise<PerpsAccountState | null> {
  try {
    const result = await cache.get(
      `sodex-perps-account-${userAddress}`,
      TTL.PERPS_ACCOUNT,
      async () => {
        const data = await publicGet<{
          accountID: number;
          balances: PerpsBalance[];
          positions: PerpsPosition[];
          openOrders: unknown[];
        }>(`${PERPS}/accounts/${userAddress}/state`);
        return {
          accountID: data.accountID,
          balances: data.balances ?? [],
          positions: data.positions ?? [],
          openOrdersCount: (data.openOrders ?? []).length,
        } as PerpsAccountState;
      },
    );
    return result.data;
  } catch (err) {
    console.warn(`[SoDEX] getPerpsAccountState failed for ${userAddress}:`, err);
    return null;
  }
}

export async function getPerpsKlines(
  symbol: string,
  interval = "1h",
  limit = 100,
): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
  try {
    const res = await fetch(
      `${PERPS}/markets/${symbol}/klines?interval=${interval}&limit=${limit}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { code: number; data: unknown };
    return parseSodexKlines(json.data);
  } catch {
    return [];
  }
}
