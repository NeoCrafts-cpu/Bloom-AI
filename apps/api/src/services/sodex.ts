import { config } from "../config.js";
import { cache, TTL } from "../lib/cache.js";
import { getNonce } from "../signing/nonceManager.js";
import { buildTypedSignature, serializeSpotOrder, serializePerpsOrder } from "../signing/eip712.js";
import type { SpotOrderItem, PerpsOrderItem } from "@bloom-ai/types";
import { parseSodexKlines, parseSodexTickerChangePct, parseSodexTickerPrice, parseSodexTickerVolume, normalizeSodexSymbols, normalizeSodexAccountState } from "../lib/sodexParse.js";
import { ethers } from "ethers";

const SPOT = config.SODEX_SPOT_URL;
const PERPS = config.SODEX_PERPS_URL;

/** Gateway root e.g. https://testnet-gw.sodex.dev/api/v1 */
function gatewayRoot(): string {
  return SPOT.replace(/\/spot\/?$/, "") || PERPS.replace(/\/perps\/?$/, "");
}

interface SodexResponse<T> {
  code: number;
  timestamp: number;
  error?: string;
  data?: T;
}

export interface SodexApiKeyRow {
  name: string;
  type?: string;
  publicKey: string;
  expiresAt?: number;
}

export interface SodexSigningAuth {
  signingAddress: string;
  /** Null/empty = master wallet mode — omit X-API-Key header (SoDEX "default" key) */
  apiKeyName: string | null;
  source: "env" | "auto" | "master";
}

/** True when private key is set — live signing is possible (key name auto-resolved if missing). */
export function hasLiveSodexCredentials(): boolean {
  return !!config.SODEX_API_PRIVATE_KEY;
}

export function getSigningAddress(): string {
  if (!config.SODEX_API_PRIVATE_KEY) return "";
  try {
    return new ethers.Wallet(config.SODEX_API_PRIVATE_KEY).address;
  } catch {
    return "";
  }
}

export async function listSodexApiKeys(userAddress: string): Promise<{
  spot: SodexApiKeyRow[];
  perps: SodexApiKeyRow[];
}> {
  const url = `${gatewayRoot()}/user/${userAddress}/api-keys`;
  const data = await publicGet<{ spot?: SodexApiKeyRow[]; perps?: SodexApiKeyRow[] }>(url);
  return {
    spot: data?.spot ?? [],
    perps: data?.perps ?? [],
  };
}

/**
 * Resolve which X-API-Key name to send (or omit for master/"default").
 * Matches the private-key address against SoDEX-registered API keys.
 */
export async function resolveSodexSigningAuth(): Promise<SodexSigningAuth> {
  if (!config.SODEX_API_PRIVATE_KEY) {
    throw new Error("SODEX_API_PRIVATE_KEY is required for live SoDEX execution");
  }

  const signingAddress = getSigningAddress();
  if (!signingAddress) {
    throw new Error("SODEX_API_PRIVATE_KEY is invalid");
  }

  const envName = config.SODEX_API_KEY_NAME.trim();
  if (envName && envName.toLowerCase() !== "default") {
    return { signingAddress, apiKeyName: envName, source: "env" };
  }

  // Query keys for configured account address and/or signing address
  const lookupAddrs = [
    ...new Set(
      [config.SODEX_API_KEY_ADDRESS, signingAddress]
        .map((a) => a?.trim().toLowerCase())
        .filter((a): a is string => !!a && /^0x[0-9a-f]{40}$/.test(a)),
    ),
  ];

  let matched: SodexApiKeyRow | null = null;
  for (const addr of lookupAddrs) {
    try {
      const keys = await listSodexApiKeys(addr);
      const all = [...keys.spot, ...keys.perps];
      const hit = all.find(
        (k) => k.publicKey?.toLowerCase() === signingAddress.toLowerCase(),
      );
      if (hit) {
        matched = hit;
        break;
      }
      // If listing from master, also find any non-default key whose pubkey matches
      if (!matched) {
        const named = all.find(
          (k) =>
            k.name?.toLowerCase() !== "default" &&
            k.publicKey?.toLowerCase() === signingAddress.toLowerCase(),
        );
        if (named) matched = named;
      }
    } catch (err) {
      console.warn(`[SoDEX] api-keys lookup failed for ${addr}:`, (err as Error).message);
    }
  }

  if (!matched || matched.name.toLowerCase() === "default") {
    // Master wallet signing — omit X-API-Key per SoDEX docs
    return { signingAddress, apiKeyName: null, source: "master" };
  }

  return { signingAddress, apiKeyName: matched.name, source: "auto" };
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
  if (!config.SODEX_API_PRIVATE_KEY) {
    throw new Error("SODEX_API_PRIVATE_KEY is required for live SoDEX execution");
  }

  const auth = await resolveSodexSigningAuth();
  const signingAddress = auth.signingAddress;
  const nonce = await getNonce(signingAddress);
  const payload = { type: actionType, params };
  const { typedSig } = await buildTypedSignature(payload, nonce, domainName);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Sign": typedSig,
    "X-API-Nonce": String(nonce),
    // Recommended by SoDEX auth docs — identifies signature domain / network
    "X-API-Chain": String(config.SODEX_CHAIN_ID),
  };
  // Named API key → send name. Master/"default" → omit header (SoDEX docs).
  if (auth.apiKeyName) {
    headers["X-API-Key"] = auth.apiKeyName;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(15000),
  });

  const json = (await res.json()) as SodexResponse<T>;
  if (json.code !== 0 && json.code !== 200) {
    const errText = String(json.error ?? "unknown");
    const hint =
      /api key not found/i.test(errText)
        ? ` — signature wallet ${auth.signingAddress.slice(0, 10)}… must own accountID in this request (not a different MetaMask wallet)`
        : "";
    throw new Error(
      `SoDEX ${actionType} error ${json.code}: ${errText}` +
        ` (auth=${auth.source}, key=${auth.apiKeyName ?? "omit/master"})` +
        hint,
    );
  }
  return json.data as T;
}

/**
 * Submit a pre-signed SoDEX action (user MetaMask signature).
 * Master-wallet mode: omit X-API-Key — signer must own the accountID in params.
 */
export async function submitUserSignedPost<T>(args: {
  url: string;
  actionType: string;
  params: Record<string, unknown>;
  typedSig: string;
  nonce: number;
  signingAddress: string;
  apiKeyName?: string | null;
}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Sign": args.typedSig,
    "X-API-Nonce": String(args.nonce),
    "X-API-Chain": String(config.SODEX_CHAIN_ID),
  };
  if (args.apiKeyName) {
    headers["X-API-Key"] = args.apiKeyName;
  }

  const res = await fetch(args.url, {
    method: "POST",
    headers,
    body: JSON.stringify(args.params),
    signal: AbortSignal.timeout(15000),
  });

  const json = (await res.json()) as SodexResponse<T>;
  if (json.code !== 0 && json.code !== 200) {
    const errText = String(json.error ?? "unknown");
    const hint =
      /api key not found/i.test(errText)
        ? ` — wallet ${args.signingAddress.slice(0, 10)}… must be the SoDEX account owner (master) for accountID in this order`
        : "";
    throw new Error(
      `SoDEX ${args.actionType} error ${json.code}: ${errText}` +
        ` (auth=user-wallet, key=${args.apiKeyName ?? "omit/master"})` +
        hint,
    );
  }
  return json.data as T;
}

export async function submitUserSignedSpotBatch(
  params: { accountID: number; orders: Record<string, unknown>[] },
  typedSig: string,
  nonce: number,
  signingAddress: string,
): Promise<{ clOrdID: string; status: string; message?: string; code?: number; orderID?: number }[]> {
  return submitUserSignedPost({
    url: `${SPOT}/trade/orders/batch`,
    actionType: "batchNewOrder",
    params,
    typedSig,
    nonce,
    signingAddress,
    apiKeyName: null,
  });
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
  /** SoDEX markets/symbols status string when present (often stale vs live reject reasons) */
  status?: string;
}

/** Runtime denylist — REST status can still say TRADING while engine returns cancel-only. */
const cancelOnlyUntil = new Map<number, number>();
const CANCEL_ONLY_TTL_MS = 15 * 60 * 1000;

export function markSymbolCancelOnly(symbolID: number): void {
  if (!(symbolID > 0)) return;
  cancelOnlyUntil.set(symbolID, Date.now() + CANCEL_ONLY_TTL_MS);
}

export function isSymbolCancelOnly(symbolID: number): boolean {
  const until = cancelOnlyUntil.get(symbolID);
  if (!until) return false;
  if (Date.now() > until) {
    cancelOnlyUntil.delete(symbolID);
    return false;
  }
  return true;
}

export function isCancelOnlyError(message: string): boolean {
  return /cancel\s*only/i.test(message);
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
  const raw = await publicGet<unknown>(`${SPOT}/markets/symbols`);
  return normalizeSodexSymbols(raw) as SodexSymbol[];
}

export async function getSymbols(): Promise<SodexSymbol[]> {
  try {
    const result = await cache.get("sodex-symbols-v2", TTL.SODEX_SYMBOLS, fetchSymbols);
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
    const quote = s.quoteAsset;
    if (quote !== "vUSDC" && quote !== "USDC") continue;
    const base = s.baseAsset.replace(/^v/, "").toUpperCase();
    // Prefer real vBTC over TESTBTC when both exist
    if (map[base] && s.baseAsset.toUpperCase().startsWith("TEST")) continue;
    map[base] = s.symbolID;
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
      `sodex-account-${userAddress.toLowerCase()}`,
      TTL.ACCOUNT_STATE,
      async () => {
        const data = await publicGet<unknown>(`${SPOT}/accounts/${userAddress}/state`);
        const normalized = normalizeSodexAccountState(data);
        if (!normalized) throw new Error("SoDEX account state missing aid/accountID");
        return normalized as AccountState;
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
  if (!hasLiveSodexCredentials()) {
    console.warn("[Broker] SODEX_API_PRIVATE_KEY not set — simulating order fills");
    return orders.map((o) => ({
      clOrdID: o.clOrdID,
      status: "FILLED",
      message: "Simulated — configure SODEX_API_PRIVATE_KEY for live execution (key name auto-resolved)",
    }));
  }

  // Spot BatchNewOrderRequest: { accountID, orders[] } — symbolID lives on each order item
  const serialized = orders.map((o) =>
    serializeSpotOrder({
      symbolID: o.symbolID || symbolID,
      clOrdID: o.clOrdID,
      side: o.side,
      type: o.type,
      timeInForce: o.timeInForce,
      price: o.price,
      quantity: o.quantity,
      funds: o.funds,
    }),
  );

  // Spot /trade/orders/batch must sign as batchNewOrder (newOrder → "API key not found")
  return signedPost<{ clOrdID: string; status: string; message?: string; code?: number; orderID?: number }[]>(
    `${SPOT}/trade/orders/batch`,
    "spot",
    "batchNewOrder",
    { accountID, orders: serialized },
  );
}

export async function placeBatchPerpsOrders(
  accountID: number,
  symbolID: number,
  orders: PerpsOrderItem[],
) {
  if (!hasLiveSodexCredentials()) {
    return orders.map((o) => ({
      clOrdID: o.clOrdID,
      status: "FILLED",
      message: "Simulated — configure SODEX_API_PRIVATE_KEY for live execution (key name auto-resolved)",
    }));
  }

  return signedPost(
    `${PERPS}/trade/orders/batch`,
    "futures",
    "batchNewOrder",
    {
      accountID,
      symbolID,
      orders: orders.map((o) => serializePerpsOrder(o)),
    },
  );
}

export async function cancelOrder(
  accountID: number,
  symbolID: number,
  clOrdID: string,
  isPerps = false,
) {
  if (!hasLiveSodexCredentials()) {
    return { clOrdID, status: "CANCELLED", message: "Simulated" };
  }
  if (isPerps) {
    return signedPost(
      `${PERPS}/trade/orders/batch`,
      "futures",
      "batchCancelOrder",
      { accountID, cancels: [{ symbolID, clOrdID }] },
    );
  }
  // Spot cancel: { accountID, cancels: [{ symbolID, clOrdID }] }
  return signedPost(
    `${SPOT}/trade/orders/batch`,
    "spot",
    "batchCancelOrder",
    { accountID, cancels: [{ symbolID, clOrdID }] },
  );
}

/** TWAP order (spot or perps) — requires live keys + SODEX_ENABLE_TWAP=1 */
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
  if (!hasLiveSodexCredentials()) {
    throw new Error("TWAP requires SODEX_API_PRIVATE_KEY — refusing simulated TWAP");
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
  if (!hasLiveSodexCredentials()) {
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
    const result = await cache.get("perps-symbols-v2", TTL.SODEX_SYMBOLS, async () => {
      const raw = await publicGet<unknown>(`${PERPS}/markets/symbols`);
      return normalizeSodexSymbols(raw).map((s) => ({
        symbol: s.symbol,
        symbolID: s.symbolID,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        maxLeverage: 20,
        pricePrecision: s.pricePrecision,
        quantityPrecision: s.quantityPrecision,
      }));
    });
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
      `sodex-perps-account-${userAddress.toLowerCase()}`,
      TTL.PERPS_ACCOUNT,
      async () => {
        const data = await publicGet<unknown>(`${PERPS}/accounts/${userAddress}/state`);
        const normalized = normalizeSodexAccountState(data);
        if (!normalized) throw new Error("SoDEX perps account state missing aid/accountID");
        const raw = data as Record<string, unknown>;
        return {
          accountID: normalized.accountID,
          balances: normalized.balances.map((b) => ({
            ...b,
            unrealizedPnl: "0",
            marginBalance: b.total,
          })),
          positions: Array.isArray(raw.P) ? (raw.P as PerpsPosition[]) : Array.isArray(raw.positions) ? (raw.positions as PerpsPosition[]) : [],
          openOrdersCount: normalized.openOrdersCount,
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
