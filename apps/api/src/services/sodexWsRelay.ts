/**
 * SoDEX WebSocket relay
 * - Public: market trades + allMarkPrice → MARKET_UPDATE (never ORDER_FILL)
 * - User accountTrade (wallet from API key) → real ORDER_FILL with orderId + symbol
 * Docs: https://sodex.com/documentation/trading-api/websocket-v1.md
 * Account streams require a user address but no API-key login.
 */
import WebSocket from "ws";
import { ethers } from "ethers";
import { config } from "../config.js";
import { wsManager } from "../ws/manager.js";
import { getSymbols, getSymbolName } from "./sodex.js";
import { setMarkPrices, getMarkPriceCacheStatus } from "./markPriceCache.js";
import { tradeStore } from "../store/tradeStore.js";
import type { OrderFill } from "@bloom-ai/types";

type RelayChannel = "spot" | "perps";

interface RelayState {
  ws: WebSocket | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  pingTimer: ReturnType<typeof setInterval> | null;
  lastMessageAt: number | null;
  status: "idle" | "connecting" | "connected" | "error";
  lastError: string | null;
  accountSubscribed: boolean;
}

const state: Record<RelayChannel, RelayState> = {
  spot: {
    ws: null,
    reconnectTimer: null,
    pingTimer: null,
    lastMessageAt: null,
    status: "idle",
    lastError: null,
    accountSubscribed: false,
  },
  perps: {
    ws: null,
    reconnectTimer: null,
    pingTimer: null,
    lastMessageAt: null,
    status: "idle",
    lastError: null,
    accountSubscribed: false,
  },
};

function urlFor(channel: RelayChannel): string {
  return channel === "spot" ? config.SODEX_WS_SPOT : config.SODEX_WS_PERPS;
}

function tradingUserAddress(): string {
  if (config.SODEX_API_KEY_ADDRESS) return config.SODEX_API_KEY_ADDRESS.toLowerCase();
  if (config.SODEX_API_PRIVATE_KEY) {
    try {
      return new ethers.Wallet(config.SODEX_API_PRIVATE_KEY).address.toLowerCase();
    } catch {
      return "";
    }
  }
  return "";
}

async function resolveTradeSymbols(): Promise<string[]> {
  const symbols = await getSymbols().catch(() => []);
  const names = symbols
    .filter((s) => s.quoteAsset === "vUSDC" || s.quoteAsset === "USDC")
    .map((s) => s.symbol)
    .filter(Boolean);
  if (names.length > 0) return names.slice(0, 40);

  const fallbackBases = ["BTC", "ETH", "SOL", "BNB", "AVAX", "ARB", "OP"];
  const resolved: string[] = [];
  for (const base of fallbackBases) {
    const name = await getSymbolName(base);
    if (name) resolved.push(name);
  }
  return resolved;
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

async function subscribeAll(ws: WebSocket, channel: RelayChannel): Promise<void> {
  const tradeSymbols = await resolveTradeSymbols();

  // Public market trades — provenance MARKET_UPDATE only
  if (tradeSymbols.length > 0) {
    sendJson(ws, {
      op: "subscribe",
      params: { channel: "trade", symbols: tradeSymbols.slice(0, 20) },
    });
  }

  if (channel === "perps") {
    sendJson(ws, {
      op: "subscribe",
      params: { channel: "allMarkPrice" },
    });
  }

  // User account fills — subscribe with configured trading wallet
  const user = tradingUserAddress();
  if (user && tradeSymbols.length > 0) {
    sendJson(ws, {
      op: "subscribe",
      params: {
        channel: "accountTrade",
        user,
        symbols: tradeSymbols.slice(0, 20),
      },
    });
    sendJson(ws, {
      op: "subscribe",
      params: {
        channel: "accountOrderUpdate",
        user,
        symbols: tradeSymbols.slice(0, 20),
      },
    });
    state[channel].accountSubscribed = true;
    console.log(`[SoDEX-WS] ${channel} account streams → ${user}`);
  } else {
    state[channel].accountSubscribed = false;
    console.warn(
      `[SoDEX-WS] ${channel} account fills disabled — set SODEX_API_KEY_ADDRESS or SODEX_API_PRIVATE_KEY`,
    );
  }
}

function parseUserTrade(raw: Record<string, unknown>, venue: RelayChannel): OrderFill | null {
  const symbol = String(raw.s ?? raw.symbol ?? "");
  const orderId = String(raw.i ?? raw.orderId ?? raw.t ?? "");
  const clOrdID = String(raw.c ?? raw.clOrdID ?? orderId);
  if (!symbol || !orderId) return null;

  const sideStr = String(raw.S ?? raw.side ?? "").toUpperCase();
  const side = sideStr === "SELL" || sideStr === "2" ? 2 : 1;
  const fillPrice = parseFloat(String(raw.p ?? raw.price ?? "0"));
  const fillQuantity = parseFloat(String(raw.q ?? raw.quantity ?? "0"));
  const ts = Number(raw.T ?? raw.E ?? Date.now());

  return {
    orderId: `${venue}-${orderId}`,
    clOrdID,
    symbol,
    side: side as 1 | 2,
    fillPrice,
    fillQuantity,
    status: "filled",
    timestamp: new Date(Number.isFinite(ts) ? ts : Date.now()).toISOString(),
  };
}

function ingestMarkPrices(data: unknown): void {
  const rows = Array.isArray(data) ? data : [data];
  const entries: { symbol: string; price: number }[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const symbol = String(r.s ?? r.symbol ?? "");
    const price = parseFloat(String(r.p ?? r.markPrice ?? "0"));
    if (symbol && price > 0) entries.push({ symbol, price });
  }
  if (entries.length === 0) return;
  setMarkPrices(entries);
  const updated = tradeStore.updatePnlFromMarks(
    Object.fromEntries(entries.map((e) => [e.symbol, e.price])),
  );
  if (updated > 0) {
    console.log(`[SoDEX-WS] MTM updated ${updated} trade(s)`);
  }
}

function normalizeAndBroadcast(channel: RelayChannel, raw: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  const msg = parsed as {
    channel?: string;
    type?: string;
    data?: unknown;
    op?: string;
    success?: boolean;
  };

  // Ignore subscribe acks / pongs
  if (msg.op === "pong" || msg.op === "subscribe" || msg.op === "unsubscribe") return;

  const topic = (msg.channel ?? "").toString();
  const now = new Date().toISOString();

  if (topic === "accountTrade") {
    const rows = Array.isArray(msg.data) ? msg.data : msg.data ? [msg.data] : [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const fill = parseUserTrade(row as Record<string, unknown>, channel);
      if (!fill) continue;
      wsManager.broadcast({
        type: "ORDER_FILL",
        payload: {
          ...fill,
          venue: channel,
          source: "sodex-ws-account",
          simulated: false,
        },
        timestamp: now,
      });
    }
    return;
  }

  if (topic === "accountOrderUpdate") {
    wsManager.broadcast({
      type: "MARKET_UPDATE",
      payload: { channel, source: "sodex-ws-account-order", topic, data: msg.data },
      timestamp: now,
    });
    return;
  }

  if (topic === "markPrice" || topic === "allMarkPrice") {
    ingestMarkPrices(msg.data);
    wsManager.broadcast({
      type: "MARKET_UPDATE",
      payload: { channel, source: "sodex-ws-mark", topic, data: msg.data },
      timestamp: now,
    });
    return;
  }

  // Public market trades — never ORDER_FILL
  wsManager.broadcast({
    type: "MARKET_UPDATE",
    payload: { channel, source: "sodex-ws", topic: topic || "unknown", data: msg.data ?? msg },
    timestamp: now,
  });
}

function clearPing(channel: RelayChannel): void {
  const s = state[channel];
  if (s.pingTimer) {
    clearInterval(s.pingTimer);
    s.pingTimer = null;
  }
}

function connect(channel: RelayChannel): void {
  const s = state[channel];
  if (s.ws && (s.ws.readyState === WebSocket.OPEN || s.ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  s.status = "connecting";
  const url = urlFor(channel);
  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch (err) {
    s.status = "error";
    s.lastError = (err as Error).message;
    scheduleReconnect(channel);
    return;
  }
  s.ws = ws;

  ws.on("open", () => {
    s.status = "connected";
    s.lastError = null;
    console.log(`[SoDEX-WS] ${channel} connected → ${url}`);
    void subscribeAll(ws, channel).catch((err) => {
      s.lastError = (err as Error).message;
      console.warn(`[SoDEX-WS] ${channel} subscribe failed:`, s.lastError);
    });
    clearPing(channel);
    s.pingTimer = setInterval(() => {
      try {
        sendJson(ws, { op: "ping" });
      } catch {
        /* ignore */
      }
    }, 20_000);
  });

  ws.on("message", (data) => {
    s.lastMessageAt = Date.now();
    normalizeAndBroadcast(channel, data.toString());
  });

  ws.on("close", () => {
    s.status = "idle";
    s.ws = null;
    s.accountSubscribed = false;
    clearPing(channel);
    console.warn(`[SoDEX-WS] ${channel} closed — reconnecting`);
    scheduleReconnect(channel);
  });

  ws.on("error", (err) => {
    s.status = "error";
    s.lastError = err.message;
    console.warn(`[SoDEX-WS] ${channel} error:`, err.message);
  });
}

function scheduleReconnect(channel: RelayChannel): void {
  const s = state[channel];
  if (s.reconnectTimer) return;
  s.reconnectTimer = setTimeout(() => {
    s.reconnectTimer = null;
    connect(channel);
  }, 5_000);
}

export function startSodexWsRelay(): void {
  connect("spot");
  connect("perps");
}

export function getSodexWsRelayStatus() {
  return {
    spot: {
      status: state.spot.status,
      lastMessageAt: state.spot.lastMessageAt,
      lastError: state.spot.lastError,
      accountSubscribed: state.spot.accountSubscribed,
    },
    perps: {
      status: state.perps.status,
      lastMessageAt: state.perps.lastMessageAt,
      lastError: state.perps.lastError,
      accountSubscribed: state.perps.accountSubscribed,
    },
    tradingUser: tradingUserAddress() || null,
    marks: getMarkPriceCacheStatus(),
  };
}
