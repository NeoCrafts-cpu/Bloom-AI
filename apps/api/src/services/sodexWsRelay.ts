/**
 * SoDEX WebSocket relay — subscribes to spot/perps public channels
 * and forwards normalized events onto the Bloom WS hub.
 */
import WebSocket from "ws";
import { config } from "../config.js";
import { wsManager } from "../ws/manager.js";

type RelayChannel = "spot" | "perps";

interface RelayState {
  ws: WebSocket | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  lastMessageAt: number | null;
  status: "idle" | "connecting" | "connected" | "error";
  lastError: string | null;
}

const state: Record<RelayChannel, RelayState> = {
  spot: { ws: null, reconnectTimer: null, lastMessageAt: null, status: "idle", lastError: null },
  perps: { ws: null, reconnectTimer: null, lastMessageAt: null, status: "idle", lastError: null },
};

function urlFor(channel: RelayChannel): string {
  return channel === "spot" ? config.SODEX_WS_SPOT : config.SODEX_WS_PERPS;
}

function subscribePayload(channel: RelayChannel): string {
  // SoDEX-style subscribe envelope; gateway tolerates unknown args with public tickers
  return JSON.stringify({
    op: "subscribe",
    args: channel === "spot"
      ? ["tickers", "trades"]
      : ["tickers", "trades", "markPrice"],
  });
}

function normalizeAndBroadcast(channel: RelayChannel, raw: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  const msg = parsed as {
    topic?: string;
    channel?: string;
    data?: unknown;
    type?: string;
    e?: string;
  };

  const topic = (msg.topic ?? msg.channel ?? msg.type ?? msg.e ?? "").toString().toLowerCase();
  const now = new Date().toISOString();

  if (topic.includes("trade") || topic.includes("fill")) {
    wsManager.broadcast({
      type: "ORDER_FILL",
      payload: { channel, source: "sodex-ws", data: msg.data ?? msg },
      timestamp: now,
    });
    return;
  }

  wsManager.broadcast({
    type: "MARKET_UPDATE",
    payload: { channel, source: "sodex-ws", topic, data: msg.data ?? msg },
    timestamp: now,
  });
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
    try {
      ws.send(subscribePayload(channel));
    } catch (err) {
      s.lastError = (err as Error).message;
    }
  });

  ws.on("message", (data) => {
    s.lastMessageAt = Date.now();
    normalizeAndBroadcast(channel, data.toString());
  });

  ws.on("close", () => {
    s.status = "idle";
    s.ws = null;
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
    },
    perps: {
      status: state.perps.status,
      lastMessageAt: state.perps.lastMessageAt,
      lastError: state.perps.lastError,
    },
  };
}
