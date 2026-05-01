import { config } from "../config.js";
import { cache, TTL } from "../lib/cache.js";
import { getNonce } from "../signing/nonceManager.js";
import { buildTypedSignature } from "../signing/eip712.js";
import type { SpotOrderItem, PerpsOrderItem } from "@bloom-ai/types";

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
  const nonce = await getNonce(config.SODEX_API_KEY_ADDRESS);
  const payload = { type: actionType, params };
  const { typedSig } = await buildTypedSignature(payload, nonce, domainName);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": config.SODEX_API_KEY_ADDRESS,
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
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  bidPrice: string;
  askPrice: string;
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

/** Get the SoDEX spot symbol name for a base asset (e.g. "BTC" → "vBTC_vUSDC") */
export async function getSymbolName(baseAsset: string): Promise<string | null> {
  const symbols = await getSymbols();
  const found = symbols.find(
    (s) =>
      (s.baseAsset === `v${baseAsset}` || s.baseAsset === baseAsset) &&
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
  if (!config.SODEX_API_PRIVATE_KEY) {
    // Simulation mode — no private key configured
    console.warn("[Broker] SODEX_API_PRIVATE_KEY not set — simulating order fills");
    return orders.map((o) => ({
      clOrdID: o.clOrdID,
      status: "FILLED",
      message: "Simulated — configure SODEX_API_PRIVATE_KEY for live execution",
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
  if (!config.SODEX_API_PRIVATE_KEY) {
    return orders.map((o) => ({
      clOrdID: o.clOrdID,
      status: "FILLED",
      message: "Simulated — configure SODEX_API_PRIVATE_KEY for live execution",
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
  if (!config.SODEX_API_PRIVATE_KEY) {
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
