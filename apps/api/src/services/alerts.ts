/**
 * Alert engine — ETF spikes, RSI extremes, opportunity thresholds → WS broadcast.
 */
import { wsManager } from "../ws/manager.js";
import { getETFFlows, getKlines } from "./sosovalue.js";
import { getCachedOpportunities, runDiscoveryCycle } from "./opportunityEngine.js";
import { computeTAMetrics } from "../lib/ta.js";
import { getSymbolName } from "./sodex.js";

export type AlertSeverity = "info" | "warning" | "critical";

export interface BloomAlert {
  id: string;
  type: "etf_flow" | "rsi_extreme" | "opportunity" | "macro";
  severity: AlertSeverity;
  title: string;
  message: string;
  symbol?: string;
  value?: number;
  timestamp: string;
}

const recent: BloomAlert[] = [];
const MAX = 100;
let timer: ReturnType<typeof setInterval> | null = null;

function pushAlert(alert: Omit<BloomAlert, "id" | "timestamp">): BloomAlert {
  const full: BloomAlert = {
    ...alert,
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  // Dedupe similar alerts within 10 min
  const dup = recent.find(
    (a) => a.type === full.type && a.symbol === full.symbol && Date.now() - Date.parse(a.timestamp) < 10 * 60_000,
  );
  if (dup) return dup;

  recent.unshift(full);
  if (recent.length > MAX) recent.pop();
  wsManager.broadcast({
    type: "MARKET_UPDATE",
    payload: { kind: "alert", alert: full },
    timestamp: full.timestamp,
  });
  return full;
}

export function getRecentAlerts(limit = 50): BloomAlert[] {
  return recent.slice(0, limit);
}

async function scan(): Promise<void> {
  try {
    const etf = await getETFFlows();
    const total = etf.data.reduce((s, f) => s + f.netInflow, 0);
    if (Math.abs(total) >= 200_000_000) {
      pushAlert({
        type: "etf_flow",
        severity: total > 0 ? "info" : "warning",
        title: total > 0 ? "ETF inflow spike" : "ETF outflow spike",
        message: `Net ETF flow ${total >= 0 ? "+" : ""}$${(total / 1e6).toFixed(0)}M`,
        value: total,
      });
    }

    for (const base of ["BTC", "ETH", "SOL"] as const) {
      try {
        const sym = await getSymbolName(base);
        if (!sym) continue;
        const klines = await getKlines(sym, "1h", 48);
        const ta = computeTAMetrics(klines as Parameters<typeof computeTAMetrics>[0]);
        if (!ta) continue;
        if (ta.rsi14 >= 75 || ta.rsi14 <= 25) {
          pushAlert({
            type: "rsi_extreme",
            severity: ta.rsi14 >= 75 ? "warning" : "info",
            title: `${base} RSI extreme`,
            message: `RSI ${ta.rsi14.toFixed(0)} (${ta.trend})`,
            symbol: base,
            value: ta.rsi14,
          });
        }
      } catch {
        // skip symbol
      }
    }

    let opps = getCachedOpportunities().data;
    if (opps.length === 0) opps = await runDiscoveryCycle().catch(() => []);
    for (const o of opps.slice(0, 3)) {
      if (o.totalScore >= 25) {
        pushAlert({
          type: "opportunity",
          severity: "info",
          title: `High opportunity: ${o.symbol}`,
          message: o.thesis,
          symbol: o.symbol,
          value: o.totalScore,
        });
      }
    }
  } catch (err) {
    console.warn("[Alerts] scan failed:", (err as Error).message);
  }
}

export function startAlertEngine(): void {
  if (timer) return;
  console.log("[Alerts] Engine started (5 min interval)");
  void scan();
  timer = setInterval(() => void scan(), 5 * 60_000);
}
