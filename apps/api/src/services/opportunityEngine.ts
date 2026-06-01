import { v4 as uuid } from "uuid";
import type {
  OpportunityScore,
  OpportunitySignal,
  OpportunityEvidence,
  SignalEvidence,
} from "@bloom-ai/types";
import {
  getETFFlows,
  getNewsSentiment,
  getMarketSnapshots,
  getKlines,
} from "../services/sosovalue.js";
import { getSymbolIdMap } from "../services/sodex.js";
import { computeTAMetrics, taScore } from "../lib/ta.js";
import { signalLedger } from "../store/signalLedger.js";
import { config } from "../config.js";

const UNIVERSE = ["BTC", "ETH", "SOL", "BNB", "AVAX", "ARB", "OP"] as const;

let lastSnapshot: { data: OpportunityScore[]; cachedAt: string; isStale: boolean } | null = null;

function aggregateNewsSentiment(
  sentiment: Awaited<ReturnType<typeof getNewsSentiment>>["data"],
  symbol: string,
): number {
  const relevant = sentiment.filter(
    (n) =>
      n.tags.some((t) => t.toUpperCase().includes(symbol)) ||
      n.title.toUpperCase().includes(symbol),
  );
  if (relevant.length === 0) return 0;
  return relevant.reduce((s, n) => s + n.score, 0) / relevant.length;
}

export async function runOpportunityScan(recordToLedger = true): Promise<OpportunityScore[]> {
  const [etfResult, sentimentResult, marketsResult, symbolMap] = await Promise.all([
    getETFFlows().catch(() => null),
    getNewsSentiment(20).catch(() => null),
    getMarketSnapshots().catch(() => null),
    getSymbolIdMap().catch(() => ({} as Record<string, number>)),
  ]);

  const etfFlows = etfResult?.data ?? [];
  const sentiment = sentimentResult?.data ?? [];
  const markets = marketsResult?.data ?? [];
  const totalEtfInflow = etfFlows.reduce((s, f) => s + f.netInflow, 0);
  const macroBias = totalEtfInflow > 100_000_000 ? 1 : totalEtfInflow < -50_000_000 ? -1 : 0;

  const priceMap = Object.fromEntries(markets.map((m) => [m.symbol, m]));
  const opportunities: OpportunityScore[] = [];

  for (const symbol of UNIVERSE) {
    const missingInputs: string[] = [];
    const evidence: OpportunityEvidence[] = [];
    const signals: OpportunitySignal[] = [];
    let totalScore = 0;
    const maxScore = 100;

    const market = priceMap[symbol];
    if (market) {
      evidence.push({
        module: "sosovalue/sodex",
        label: "24h Price Change",
        value: `${market.change24h >= 0 ? "+" : ""}${market.change24h.toFixed(2)}%`,
        available: true,
      });
      const momentumScore = Math.max(-15, Math.min(15, market.change24h * 3));
      totalScore += momentumScore;
      signals.push({
        name: "Price Momentum",
        score: momentumScore,
        maxScore: 15,
        direction: market.change24h >= 0 ? "bullish" : "bearish",
        detail: `${market.change24h.toFixed(2)}% 24h`,
      });
    } else {
      missingInputs.push("market price");
    }

    const newsScore = aggregateNewsSentiment(sentiment, symbol);
    if (sentiment.length > 0) {
      evidence.push({
        module: "sosovalue",
        label: "News Sentiment",
        value: newsScore.toFixed(2),
        available: true,
      });
      const scaled = newsScore * 20;
      totalScore += scaled;
      signals.push({
        name: "News Sentiment",
        score: scaled,
        maxScore: 20,
        direction: newsScore > 0.1 ? "bullish" : newsScore < -0.1 ? "bearish" : "neutral",
        detail: `Avg sentiment ${newsScore.toFixed(2)}`,
      });
    } else {
      missingInputs.push("news sentiment");
    }

    if (etfResult) {
      evidence.push({
        module: "sosovalue",
        label: "ETF Macro Bias",
        value: totalEtfInflow >= 0 ? `+$${(totalEtfInflow / 1e6).toFixed(0)}M` : `-$${(Math.abs(totalEtfInflow) / 1e6).toFixed(0)}M`,
        available: true,
      });
      if (symbol === "BTC" || symbol === "ETH") {
        const etfBoost = macroBias * 10;
        totalScore += etfBoost;
        signals.push({
          name: "ETF Flow Bias",
          score: etfBoost,
          maxScore: 10,
          direction: macroBias > 0 ? "bullish" : macroBias < 0 ? "bearish" : "neutral",
          detail: "Institutional ETF flow direction",
        });
      }
    }

    let taMetrics = null;
    try {
      const sym = `${symbol}_USDC`;
      const klines = await getKlines(sym.includes("BTC") ? "vBTC_vUSDC" : sym, "1h", 24);
      taMetrics = computeTAMetrics(klines as Parameters<typeof computeTAMetrics>[0]);
      if (taMetrics) {
        const ts = taScore(taMetrics);
        totalScore += ts;
        evidence.push({
          module: "sodex",
          label: "RSI / SMA",
          value: `RSI ${taMetrics.rsi14.toFixed(0)}, ${taMetrics.trend}`,
          available: true,
        });
        signals.push({
          name: "Technical Analysis",
          score: ts,
          maxScore: 25,
          direction: taMetrics.trend === "bullish" ? "bullish" : taMetrics.trend === "bearish" ? "bearish" : "neutral",
          detail: `RSI ${taMetrics.rsi14.toFixed(0)}, ${taMetrics.trend}`,
        });
      }
    } catch {
      missingInputs.push("klines");
    }

    const tradable = !!symbolMap[symbol];
    if (!tradable) missingInputs.push("SoDEX tradability");

    const direction: OpportunityScore["direction"] =
      totalScore > 15 ? "long" : totalScore < -10 ? "short" : "neutral";

    const action: OpportunityScore["action"] = tradable
      ? totalScore > 20
        ? "copy"
        : totalScore > 10
          ? "rebalance"
          : "watch"
      : "watch";

    const thesis =
      direction === "long"
        ? `${symbol} shows bullish confluence across ${signals.filter((s) => s.direction === "bullish").length} signals.`
        : direction === "short"
          ? `${symbol} shows bearish pressure — consider defensive posture.`
          : `${symbol} is neutral — monitor for clearer signal.`;

    let signalId: string | undefined;
    if (recordToLedger && Math.abs(totalScore) >= 10) {
      const ledgerEvidence: SignalEvidence[] = evidence.map((e) => ({
        source: e.module,
        label: e.label,
        value: e.value,
        module: e.module.includes("sodex") ? "sodex" : "sosovalue",
      }));
      const sig = signalLedger.recordSignal({
        source: "discovery",
        title: `${symbol} Opportunity — Score ${totalScore.toFixed(0)}`,
        summary: thesis,
        keyAssets: [symbol],
        evidence: ledgerEvidence,
        inputData: { symbol, etfFlows: totalEtfInflow, newsScore, taMetrics },
        contentData: { totalScore, signals, direction, action },
        modelVersion: config.OPENROUTER_MODEL,
        score: totalScore,
      });
      signalId = sig.id;
    }

    opportunities.push({
      id: `opp-${symbol}-${uuid().slice(0, 6)}`,
      symbol,
      rank: 0,
      totalScore: parseFloat(totalScore.toFixed(1)),
      maxScore,
      direction,
      action,
      tradable,
      signals,
      evidence,
      missingInputs,
      thesis,
      signalId,
      cachedAt: new Date().toISOString(),
      isStale: false,
    });
  }

  opportunities.sort((a, b) => b.totalScore - a.totalScore);
  opportunities.forEach((o, i) => {
    o.rank = i + 1;
  });

  lastSnapshot = {
    data: opportunities,
    cachedAt: new Date().toISOString(),
    isStale: false,
  };

  return opportunities;
}

export function getCachedOpportunities(): {
  data: OpportunityScore[];
  cachedAt: string | null;
  isStale: boolean;
} {
  if (!lastSnapshot) {
    return { data: [], cachedAt: null, isStale: true };
  }
  const age = Date.now() - new Date(lastSnapshot.cachedAt).getTime();
  return {
    ...lastSnapshot,
    isStale: age > 5 * 60 * 1000,
  };
}

export let discoveryStatus: {
  status: "idle" | "running" | "error";
  lastRun: string | null;
  lastError: string | null;
} = { status: "idle", lastRun: null, lastError: null };

export async function runDiscoveryCycle(): Promise<OpportunityScore[]> {
  discoveryStatus.status = "running";
  try {
    const result = await runOpportunityScan(true);
    discoveryStatus.status = "idle";
    discoveryStatus.lastRun = new Date().toISOString();
    discoveryStatus.lastError = null;
    return result;
  } catch (err) {
    discoveryStatus.status = "error";
    discoveryStatus.lastError = (err as Error).message;
    throw err;
  }
}
