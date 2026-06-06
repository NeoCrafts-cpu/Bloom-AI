import { v4 as uuid } from "uuid";
import type { SmartMoneyNewsletter } from "@bloom-ai/types";
import { getMarketSnapshots, getETFFlows, getKlines } from "../../services/sosovalue.js";
import { getSymbolName } from "../../services/sodex.js";
import { config } from "../../config.js";
import { wsManager } from "../../ws/manager.js";
import { newsletterStore } from "../../store/newsletter.js";

let isRunning = false;
let intervalHandle: NodeJS.Timeout | null = null;

export let chartAnalystStatus: {
  status: "running" | "idle" | "error";
  lastRun: string | null;
  lastError: string | null;
  cycleCount: number;
} = { status: "idle", lastRun: null, lastError: null, cycleCount: 0 };

/**
 * Chart Analyst Agent — technical analysis engine.
 * Fetches OHLCV data from SoDEX, computes basic TA metrics,
 * calls OpenRouter LLM for analysis commentary, posts to Terminal Feed.
 */
export async function runChartAnalystCycle(): Promise<SmartMoneyNewsletter | null> {
  chartAnalystStatus.status = "running";
  try {
    console.log("[ChartAnalyst] Starting TA cycle...");

    // Resolve SoDEX symbols for BTC, ETH, SOL
    const [btcSym, ethSym, solSym] = await Promise.all([
      getSymbolName("BTC"),
      getSymbolName("ETH"),
      getSymbolName("SOL"),
    ]);

    // Fetch 24h hourly klines + market data in parallel
    const [btcKlines, ethKlines, solKlines, marketsResult, etfResult] = await Promise.all([
      btcSym ? getKlines(btcSym, "1h", 24) : Promise.resolve([]),
      ethSym ? getKlines(ethSym, "1h", 24) : Promise.resolve([]),
      solSym ? getKlines(solSym, "1h", 24) : Promise.resolve([]),
      getMarketSnapshots().catch(() => null),
      getETFFlows().catch(() => null),
    ]);

    const markets = (marketsResult?.data ?? []) as { symbol: string; change24h: number }[];
    const etf = (etfResult?.data ?? []) as { netInflow: number }[];

    // Compute basic TA metrics
    type KlineBar = { time: number; open: number; high: number; low: number; close: number; volume: number };
    function computeMetrics(klines: KlineBar[]) {
      if (klines.length < 2) return null;
      const closes = klines.map((k) => k.close);
      const last = closes[closes.length - 1];
      const open = closes[0];
      const high = Math.max(...klines.map((k) => k.high));
      const low  = Math.min(...klines.map((k) => k.low));
      const sma  = closes.slice(-12).reduce((s: number, v: number) => s + v, 0) / Math.min(12, closes.length);
      const totalVol = klines.reduce((s: number, k: KlineBar) => s + k.volume, 0);
      const trend = last > sma ? "above 12h SMA" : "below 12h SMA";
      const pctChange = ((last - open) / open) * 100;

      // Simple RSI approximation (14 periods)
      let gains = 0, losses = 0;
      for (let i = 1; i < Math.min(15, closes.length); i++) {
        const d = closes[i] - closes[i - 1];
        if (d > 0) gains += d; else losses -= d;
      }
      const rs = losses === 0 ? 100 : gains / losses;
      const rsi = 100 - 100 / (1 + rs);

      return { last, open, high, low, sma, trend, pctChange, rsi, totalVol };
    }

    const btcM = computeMetrics(btcKlines);
    const ethM = computeMetrics(ethKlines);
    const solM = computeMetrics(solKlines);
    const totalEtfInflow = etf.reduce((s: number, f: { netInflow: number }) => s + f.netInflow, 0);

    const contextLines = [
      `Date: ${new Date().toUTCString()}`,
      `=== 24H MARKET SNAPSHOT ===`,
      btcM ? `BTC: $${btcM.last.toFixed(0)} (${btcM.pctChange >= 0 ? "+" : ""}${btcM.pctChange.toFixed(2)}%), H: $${btcM.high.toFixed(0)}, L: $${btcM.low.toFixed(0)}, RSI-14: ${btcM.rsi.toFixed(1)}, ${btcM.trend}` : "BTC: data unavailable",
      ethM ? `ETH: $${ethM.last.toFixed(0)} (${ethM.pctChange >= 0 ? "+" : ""}${ethM.pctChange.toFixed(2)}%), H: $${ethM.high.toFixed(0)}, L: $${ethM.low.toFixed(0)}, RSI-14: ${ethM.rsi.toFixed(1)}, ${ethM.trend}` : "ETH: data unavailable",
      solM ? `SOL: $${solM.last.toFixed(2)} (${solM.pctChange >= 0 ? "+" : ""}${solM.pctChange.toFixed(2)}%), H: $${solM.high.toFixed(2)}, L: $${solM.low.toFixed(2)}, RSI-14: ${solM.rsi.toFixed(1)}, ${solM.trend}` : "SOL: data unavailable",
      `ETF Net Inflow (today): ${totalEtfInflow >= 0 ? "+" : ""}$${(totalEtfInflow / 1e6).toFixed(1)}M`,
      markets.length ? `Top coins: ${markets.slice(0, 4).map((m: { symbol: string; change24h: number }) => `${m.symbol} ${m.change24h >= 0 ? "+" : ""}${m.change24h.toFixed(1)}%`).join(", ")}` : "",
    ].filter(Boolean).join("\n");

    let analysis: { title: string; body: string; keyAssets: string[] };
    let llmWarning: string | null = null;

    if (config.OPENROUTER_API_KEY) {
      try {
        const prompt = `You are Bloom AI's Chart Analyst. Analyze this 24h market data and produce a concise technical analysis briefing:

${contextLines}

Write a 3-5 sentence technical analysis. Include: trend direction, key support/resistance levels based on the 24h range, RSI signals (overbought >70, oversold <30), and a brief outlook. Be specific with price levels. Format as plain text, no markdown, professional tone.`;

        const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.OPENROUTER_MODEL,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 400,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(20000),
        });

        if (!llmRes.ok) throw new Error(`OpenRouter ${llmRes.status}`);
        const llmJson = (await llmRes.json()) as {
          choices: { message: { content: string } }[];
        };
        const text = llmJson.choices?.[0]?.message?.content?.trim() ?? "";

        const btcPct = btcM?.pctChange ?? 0;
        const titleSentiment = btcPct >= 2 ? "Bullish" : btcPct <= -2 ? "Bearish" : "Neutral";
        analysis = {
          title: `Chart Analysis: ${titleSentiment} Setup — BTC ${btcM ? (btcM.pctChange >= 0 ? "+" : "") + btcM.pctChange.toFixed(1) + "%" : ""}`,
          body: text || fallbackBody(btcM, ethM, solM, totalEtfInflow),
          keyAssets: ["BTC", "ETH", "SOL"].filter(
            (s, i) => [btcM, ethM, solM][i] !== null,
          ),
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[ChartAnalyst] LLM call failed, using deterministic TA:", msg);
        llmWarning = `${msg} — published deterministic TA from SoDEX data`;
        analysis = {
          title: `Chart Analysis: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} Technical Briefing`,
          body: fallbackBody(btcM, ethM, solM, totalEtfInflow),
          keyAssets: ["BTC", "ETH", "SOL"].filter(
            (s, i) => [btcM, ethM, solM][i] !== null,
          ),
        };
      }
    } else {
      analysis = {
        title: `Chart Analysis: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} Technical Briefing`,
        body: fallbackBody(btcM, ethM, solM, totalEtfInflow),
        keyAssets: ["BTC", "ETH", "SOL"],
      };
    }

    const btcPct = btcM?.pctChange ?? 0;
    const narrative: SmartMoneyNewsletter["narrative"] =
      btcPct >= 2 && totalEtfInflow > 0 ? "risk-on" :
      btcPct <= -2 || totalEtfInflow < -100_000_000 ? "risk-off" :
      "neutral";

    const newsletter: SmartMoneyNewsletter = {
      id: uuid(),
      title: analysis.title,
      summary: `SoDEX chart data: BTC ${btcM ? (btcM.pctChange >= 0 ? "+" : "") + btcM.pctChange.toFixed(2) + "%" : "N/A"}, ETH ${ethM ? (ethM.pctChange >= 0 ? "+" : "") + ethM.pctChange.toFixed(2) + "%" : "N/A"}, SOL ${solM ? (solM.pctChange >= 0 ? "+" : "") + solM.pctChange.toFixed(2) + "%" : "N/A"}.`,
      body: analysis.body,
      narrative,
      keyAssets: analysis.keyAssets,
      etfFlows: (etfResult?.data ?? []) as import("@bloom-ai/types").ETFFlowData[],
      sentiment: [],
      publishedAt: new Date().toISOString(),
    };

    newsletterStore.add(newsletter);
    wsManager.broadcast({ type: "NEWSLETTER_PUBLISHED", payload: newsletter, timestamp: newsletter.publishedAt });

    chartAnalystStatus.status = "idle";
    chartAnalystStatus.lastRun = new Date().toISOString();
    chartAnalystStatus.lastError = llmWarning;
    chartAnalystStatus.cycleCount++;
    console.log(`[ChartAnalyst] Published: "${newsletter.title}"`);
    return newsletter;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ChartAnalyst] Cycle failed:", msg);
    chartAnalystStatus.status = "error";
    chartAnalystStatus.lastError = msg;
    return null;
  }
}

type Metrics = { last: number; open: number; high: number; low: number; rsi: number; pctChange: number; trend: string } | null;

function fallbackBody(btc: Metrics, eth: Metrics, sol: Metrics, etfInflow: number): string {
  const parts: string[] = [];
  if (btc) {
    const rsiLabel = btc.rsi > 70 ? "overbought" : btc.rsi < 30 ? "oversold" : "neutral";
    parts.push(`BTC is trading at $${btc.last.toFixed(0)}, ${btc.pctChange >= 0 ? "up" : "down"} ${Math.abs(btc.pctChange).toFixed(2)}% over the past 24 hours with RSI at ${btc.rsi.toFixed(1)} (${rsiLabel}). 24h range: $${btc.low.toFixed(0)} – $${btc.high.toFixed(0)}.`);
  }
  if (eth) {
    parts.push(`ETH ${eth.pctChange >= 0 ? "gained" : "lost"} ${Math.abs(eth.pctChange).toFixed(2)}% to $${eth.last.toFixed(0)}, ${eth.trend}.`);
  }
  if (sol) {
    parts.push(`SOL at $${sol.last.toFixed(2)}, ${sol.pctChange >= 0 ? "+" : ""}${sol.pctChange.toFixed(2)}%.`);
  }
  parts.push(`Spot ETF net flow: ${etfInflow >= 0 ? "+" : ""}$${(etfInflow / 1e6).toFixed(1)}M — ${etfInflow > 200e6 ? "strong institutional buying" : etfInflow < -100e6 ? "institutional outflow pressure" : "flows neutral"}.`);
  return parts.join(" ");
}

export function startChartAnalystAgent(intervalMs = 2 * 60 * 60 * 1000) {
  if (isRunning) return;
  isRunning = true;
  // First run after 5 min (let journalist run first)
  setTimeout(() => runChartAnalystCycle(), 5 * 60 * 1000);
  intervalHandle = setInterval(runChartAnalystCycle, intervalMs);
  console.log(`[ChartAnalyst] Agent started — interval ${intervalMs}ms`);
}

export function stopChartAnalystAgent() {
  if (intervalHandle) clearInterval(intervalHandle);
  isRunning = false;
  chartAnalystStatus.status = "idle";
}
