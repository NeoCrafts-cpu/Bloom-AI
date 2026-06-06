"use client";

import { useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";
import type { OrderFill, WSEvent } from "@bloom-ai/types";
import { getWsBaseUrl, panelStatusLabel, PANEL_STATUS_STYLES, type PanelDataStatus } from "@/lib/api";

function parseOrderFill(raw: unknown): OrderFill | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.orderId === "string" && typeof obj.symbol === "string") {
    return raw as OrderFill;
  }
  if (Array.isArray(obj.fills) && obj.fills.length > 0) {
    return parseOrderFill(obj.fills[0]);
  }
  return null;
}

export default function OrderFeedPanel() {
  const [orders, setOrders] = useState<OrderFill[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<PanelDataStatus>("offline");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wsBase = getWsBaseUrl();
    let ws: WebSocket | null = null;
    let closed = false;

    const connect = () => {
      try {
        ws = new WebSocket(`${wsBase}/ws`);
      } catch {
        setRealtimeStatus("offline");
        return;
      }

      ws.onopen = () => {
        if (!closed) setRealtimeStatus("live");
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as WSEvent | OrderFill;
          if ("type" in parsed && parsed.type === "ORDER_FILL") {
            const fill = parseOrderFill(parsed.payload);
            if (fill) {
              setOrders((prev) => [fill, ...prev.slice(0, 49)]);
            }
          } else {
            const direct = parseOrderFill(parsed);
            if (direct) setOrders((prev) => [direct, ...prev.slice(0, 49)]);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => {
        if (!closed) setRealtimeStatus("offline");
      };

      ws.onclose = () => {
        if (!closed) setRealtimeStatus("offline");
      };
    };

    connect();

    return () => {
      closed = true;
      ws?.close();
    };
  }, []);

  const statusStyle = PANEL_STATUS_STYLES[realtimeStatus] ?? PANEL_STATUS_STYLES.offline;

  return (
    <div className="glass-card p-5 sticky top-24">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={14} className="text-bloom-orange" />
        <span className="text-sm font-semibold text-bloom-text">Live Order Feed</span>
        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle}`}>
          {realtimeStatus === "live" ? panelStatusLabel("live") : "Realtime offline · polling history"}
        </span>
      </div>

      <div ref={containerRef} className="space-y-2 max-h-[480px] overflow-y-auto">
        {orders.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-center px-4">
            <p className="text-xs text-bloom-text-muted">No recent orders</p>
            <p className="text-[10px] text-bloom-text-muted/70 mt-1">
              {realtimeStatus === "live"
                ? "Waiting for copy-trade executions…"
                : "Connect wallet and execute a copy-trade to populate this feed"}
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.orderId}
              className="flex items-center justify-between text-xs bg-bloom-bg border border-bloom-border rounded-xl px-3 py-2 animate-fade-in"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-mono font-semibold text-bloom-text">
                  {order.symbol}
                </span>
                <span className="text-bloom-text-muted">
                  {new Date(order.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className={order.side === 1 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                  {order.side === 1 ? "BUY" : "SELL"}
                </span>
                <span className="text-bloom-text-muted">
                  {order.fillQuantity} @ ${order.fillPrice.toFixed(0)}
                </span>
              </div>
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  order.status === "filled"
                    ? "bg-emerald-900/20 text-emerald-400 border border-emerald-800/20"
                    : "bg-amber-900/20 text-amber-400 border border-amber-800/20"
                }`}
              >
                {order.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
