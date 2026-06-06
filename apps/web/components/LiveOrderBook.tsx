"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Activity, RefreshCw, AlertTriangle } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface Level { price: number; qty: number }
interface BookState { bids: Level[]; asks: Level[]; symbol: string }

const SYMBOLS = ["vBTC_vUSDC", "vETH_vUSDC", "vSOL_vUSDC"] as const;
type WSSymbol = (typeof SYMBOLS)[number];
const LABEL: Record<WSSymbol, string> = { vBTC_vUSDC: "BTC", vETH_vUSDC: "ETH", vSOL_vUSDC: "SOL" };

const WS_URL = process.env.NEXT_PUBLIC_SODEX_WS_SPOT ?? "wss://testnet-gw.sodex.dev/ws/spot";
const REST_POLL_MS = 4000;
const ENABLE_SODEX_WS = process.env.NEXT_PUBLIC_SODEX_WS_ENABLED === "true";

interface DepthPoint { price: number; bidQty: number | undefined; askQty: number | undefined }

function buildDepth(bids: Level[], asks: Level[], steps = 40): DepthPoint[] {
  const sb = [...bids].filter((l) => l.price > 0 && l.qty >= 0).sort((a, b) => b.price - a.price).slice(0, steps);
  const sa = [...asks].filter((l) => l.price > 0 && l.qty >= 0).sort((a, b) => a.price - b.price).slice(0, steps);

  let cumB = 0;
  const bidSeries = sb.map((l) => { cumB += l.qty; return { price: l.price, bidQty: cumB, askQty: undefined }; }).reverse();
  let cumA = 0;
  const askSeries = sa.map((l) => { cumA += l.qty; return { price: l.price, askQty: cumA, bidQty: undefined }; });

  return [...bidSeries, ...askSeries];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: DepthPoint }[] }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="glass-card px-3 py-2 text-xs shadow-xl">
      <p className="text-bloom-text font-semibold">${p.payload.price.toFixed(2)}</p>
      {payload.map((item) => (
        <p key={item.name} className={item.name === "bidQty" ? "text-emerald-400" : "text-red-400"}>
          {item.name === "bidQty" ? "Bids" : "Asks"}: {item.value?.toFixed(4)}
        </p>
      ))}
    </div>
  );
};

export default function LiveOrderBook() {
  const [symbol, setSymbol]       = useState<WSSymbol>("vBTC_vUSDC");
  const [book, setBook]           = useState<BookState>({ bids: [], asks: [], symbol });
  const [source, setSource]       = useState<"rest" | "websocket">("rest");
  const [wsStatus, setWsStatus]   = useState<"idle" | "connecting" | "open" | "closed" | "error">("idle");
  const wsRef  = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const startPoll = useCallback((sym: WSSymbol) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const poll = async () => {
      try {
        const res = await fetch(`/api/market/sodex/orderbook/${sym}`);
        if (!res.ok) return;
        const j   = await res.json();
        if (!j?.data) return;
        const bids: Level[] = (j.data.bids ?? []).map(([p, q]: [string, string]) => ({ price: parseFloat(p), qty: parseFloat(q) }));
        const asks: Level[] = (j.data.asks ?? []).map(([p, q]: [string, string]) => ({ price: parseFloat(p), qty: parseFloat(q) }));
        setBook({ bids, asks, symbol: sym });
        if (source !== "websocket") setSource("rest");
      } catch { /* silent */ }
    };
    poll();
    pollRef.current = setInterval(poll, REST_POLL_MS);
  }, [source]);

  const connectWS = useCallback((sym: WSSymbol) => {
    if (!ENABLE_SODEX_WS) return;

    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }

    setWsStatus("connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      setWsStatus("error");
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("open");
      setSource("websocket");
      ws.send(JSON.stringify({ op: "subscribe", params: { type: "l2book", symbol: sym } }));
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: "ping" }));
      }, 30_000);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string);
        if (msg?.data?.bids && msg?.data?.asks) {
          const bids: Level[] = msg.data.bids.map(([p, q]: [string, string]) => ({ price: parseFloat(p), qty: parseFloat(q) }));
          const asks: Level[] = msg.data.asks.map(([p, q]: [string, string]) => ({ price: parseFloat(p), qty: parseFloat(q) }));
          setBook({ bids, asks, symbol: sym });
        }
      } catch { /* ignore */ }
    };

    ws.onerror = () => setWsStatus("error");
    ws.onclose = () => {
      setWsStatus("closed");
      setSource("rest");
    };
  }, []);

  useEffect(() => {
    startPoll(symbol);
    connectWS(symbol);
    return () => {
      wsRef.current?.close();
      if (pingRef.current) clearInterval(pingRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [symbol, startPoll, connectWS]);

  const depth = buildDepth(book.bids, book.asks);
  const canRenderChart = containerWidth > 48 && depth.length >= 2;
  const midPrice = book.bids[0] && book.asks[0]
    ? ((book.bids[0].price + book.asks[0].price) / 2)
    : null;
  const spread = book.bids[0] && book.asks[0]
    ? (book.asks[0].price - book.bids[0].price)
    : null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Activity size={14} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-bloom-text">L2 Order Book Depth</h3>
            <p className="text-xs text-bloom-text-muted">
              SoDEX Testnet · {source === "websocket" ? "WebSocket" : "REST fallback"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                symbol === s
                  ? "bg-cyan-500 text-black"
                  : "bg-bloom-card-hover text-bloom-text-muted hover:text-bloom-text"
              }`}
            >
              {LABEL[s]}
            </button>
          ))}
          <div className={`w-2 h-2 rounded-full ${
            wsStatus === "open"        ? "bg-emerald-400 animate-pulse"
            : wsStatus === "connecting" ? "bg-yellow-400 animate-pulse"
            : wsStatus === "error"      ? "bg-amber-400"
            : "bg-bloom-text-muted"
          }`} title={wsStatus} />
          <button
            onClick={() => { startPoll(symbol); connectWS(symbol); }}
            className="p-1.5 rounded-lg hover:bg-bloom-card-hover text-bloom-text-muted"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {midPrice !== null && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-bloom-card-hover rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-bloom-text-muted uppercase">Mid Price</p>
            <p className="text-sm font-bold text-bloom-text">${midPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-bloom-card-hover rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-bloom-text-muted uppercase">Spread</p>
            <p className="text-sm font-bold text-bloom-text">${spread?.toFixed(2)}</p>
          </div>
          <div className="bg-bloom-card-hover rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-bloom-text-muted uppercase">Source</p>
            <p className="text-[10px] font-semibold text-bloom-text">{source === "websocket" ? "WebSocket" : "REST Poll"}</p>
          </div>
        </div>
      )}

      {wsStatus === "error" && source === "rest" && (
        <div className="flex items-center gap-1.5 mb-3 text-[10px] text-amber-400">
          <AlertTriangle size={11} />
          Realtime offline · polling REST order book
        </div>
      )}

      <div ref={containerRef}>
        {depth.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-bloom-text-muted">
            No order book data
          </div>
        ) : !canRenderChart ? (
          <div className="h-48 flex items-center justify-center text-xs text-bloom-text-muted">
            Loading chart…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={depth} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="bidGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="askGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="price"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => `$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                tick={{ fontSize: 9, fill: "#6b7280" }}
                scale="linear"
              />
              <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => (v === "bidQty" ? "Bids" : "Asks")} wrapperStyle={{ fontSize: 10 }} />
              <Area type="stepAfter" dataKey="bidQty" stroke="#10b981" strokeWidth={1.5} fill="url(#bidGrad)" connectNulls={false} />
              <Area type="stepBefore" dataKey="askQty" stroke="#ef4444" strokeWidth={1.5} fill="url(#askGrad)" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
