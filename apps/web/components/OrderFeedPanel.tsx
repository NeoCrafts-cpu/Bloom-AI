"use client";

import { useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";
import type { OrderFill } from "@bloom-ai/types";

const MOCK_ORDERS: OrderFill[] = [
  { orderId: "ord-1001", clOrdID: "bloom-1001", symbol: "BTC_USDC", side: 1, fillPrice: 68420, fillQuantity: 0.001, status: "filled", timestamp: new Date(Date.now() - 5000).toISOString() },
  { orderId: "ord-1002", clOrdID: "bloom-1002", symbol: "ETH_USDC", side: 1, fillPrice: 3812, fillQuantity: 0.015, status: "filled", timestamp: new Date(Date.now() - 12000).toISOString() },
  { orderId: "ord-1003", clOrdID: "bloom-1003", symbol: "SOL_USDC", side: 2, fillPrice: 182.4, fillQuantity: 0.5, status: "filled", timestamp: new Date(Date.now() - 30000).toISOString() },
];

export default function OrderFeedPanel() {
  const [orders, setOrders] = useState<OrderFill[]>(MOCK_ORDERS);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to WebSocket for real-time order feed
    const wsBase =
      typeof window !== "undefined" && window.location.hostname !== "localhost"
        ? "wss://bloom-ai-mqrb.onrender.com"
        : "ws://localhost:4000";

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${wsBase}/ws/orders`);
      ws.onmessage = (event) => {
        try {
          const fill: OrderFill = JSON.parse(event.data);
          setOrders((prev) => [fill, ...prev.slice(0, 49)]);
        } catch {
          // ignore
        }
      };
    } catch {
      // WebSocket not available — use mock refresh
      const interval = setInterval(() => {
        const newOrder: OrderFill = {
          orderId: `ord-${Date.now()}`,
          clOrdID: `bloom-${Date.now()}`,
          symbol: ["BTC_USDC", "ETH_USDC", "SOL_USDC"][Math.floor(Math.random() * 3)],
          side: Math.random() > 0.5 ? 1 : 2,
          fillPrice:
            Math.random() > 0.5
              ? 68000 + Math.random() * 1000
              : 3800 + Math.random() * 100,
          fillQuantity: parseFloat((Math.random() * 0.05).toFixed(4)),
          status: "filled",
          timestamp: new Date().toISOString(),
        };
        setOrders((prev) => [newOrder, ...prev.slice(0, 49)]);
      }, 8000);
      return () => clearInterval(interval);
    }

    return () => ws?.close();
  }, []);

  return (
    <div className="glass-card p-5 sticky top-24">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={14} className="text-bloom-orange" />
        <span className="text-sm font-semibold text-bloom-text">Live Order Feed</span>
        <span className="live-dot ml-auto" />
      </div>

      <div ref={containerRef} className="space-y-2 max-h-[480px] overflow-y-auto">
        {orders.map((order) => (
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
        ))}
      </div>
    </div>
  );
}
