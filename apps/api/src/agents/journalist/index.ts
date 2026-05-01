import { v4 as uuid } from "uuid";
import type { SmartMoneyNewsletter } from "@bloom-ai/types";
import {
  getETFFlows,
  getNewsSentiment,
  getMarketSnapshots,
  getLatestCryptoNews,
  getDefiLlamaTVL,
} from "../../services/sosovalue.js";
import { config } from "../../config.js";
import { wsManager } from "../../ws/manager.js";
import { newsletterStore } from "../../store/newsletter.js";

let isRunning = false;
let intervalHandle: NodeJS.Timeout | null = null;

// Track journalist agent status for health endpoint
export let journalistStatus: {
  status: "running" | "idle" | "error";
  lastRun: string | null;
  lastError: string | null;
  cycleCount: number;
} = { status: "idle", lastRun: null, lastError: null, cycleCount: 0 };

/**
 * Journalist Agent — the media engine of Bloom AI.
 *
 * Fetches real-time data from SoSoValue Terminal API, DeFiLlama, CryptoPanic,
 * and SoDEX market tickers. Uses OpenRouter LLM to synthesise institutional-
 * grade "Smart Money" newsletters. Falls back to a data-driven template when
 * no LLM key is configured.
 */
export async function runJournalistCycle(): Promise<SmartMoneyNewsletter | null> {
  journalistStatus.status = "running";
  try {
    console.log("[Journalist] Starting analysis cycle...");

    // Gather all data in parallel — cache layer handles rate limits
    const [etfResult, sentimentResult, marketsResult, cryptoNews, defiTVL] = await Promise.all([
      getETFFlows().catch(() => null),
      getNewsSentiment(8).catch(() => null),
      getMarketSnapshots().catch(() => null),
      getLatestCryptoNews(),
      getDefiLlamaTVL(),
    ]);

    const etfFlows = etfResult?.data ?? [];
    const sentiment = sentimentResult?.data ?? [];
    const markets = marketsResult?.data ?? [];

    const context = buildMarketContext({ etfFlows, sentiment, markets, cryptoNews, defiTVL });
    const generated = await callLLM(context, { etfFlows, sentiment, markets, cryptoNews, defiTVL });

    const avgSentiment = sentiment.reduce((s, n) => s + n.score, 0) / (sentiment.length || 1);
    const totalETFInflow = etfFlows.reduce((s, f) => s + f.netInflow, 0);

    const narrative: SmartMoneyNewsletter["narrative"] =
      totalETFInflow > 200_000_000 && avgSentiment > 0.4
        ? "risk-on"
        : totalETFInflow < -100_000_000 || avgSentiment < -0.3
          ? "risk-off"
          : avgSentiment > 0.2
            ? "rotation"
            : "neutral";

    const newsletter: SmartMoneyNewsletter = {
      id: uuid(),
      title: generated.title,
      summary: generated.summary,
      body: generated.body,
      narrative,
      keyAssets: generated.keyAssets,
      etfFlows,
      sentiment: sentiment.slice(0, 4),
      publishedAt: new Date().toISOString(),
    };

    newsletterStore.add(newsletter);
    wsManager.broadcast({ type: "NEWSLETTER_PUBLISHED", payload: newsletter, timestamp: newsletter.publishedAt });

    journalistStatus.status = "idle";
    journalistStatus.lastRun = new Date().toISOString();
    journalistStatus.lastError = null;
    journalistStatus.cycleCount++;

    console.log(`[Journalist] Published: "${newsletter.title}"`);
    return newsletter;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Journalist] Cycle failed:", msg);
    journalistStatus.status = "error";
    journalistStatus.lastError = msg;
    return null;
  }
}

export function startJournalistAgent() {
  if (isRunning) return;
  isRunning = true;

  // Run immediately on start (don't wait for first interval)
  runJournalistCycle();

  intervalHandle = setInterval(runJournalistCycle, config.JOURNALIST_INTERVAL_MS);
  console.log(`[Journalist] Agent started — interval ${config.JOURNALIST_INTERVAL_MS}ms`);
}

export function stopJournalistAgent() {
  if (intervalHandle) clearInterval(intervalHandle);
  isRunning = false;
  journalistStatus.status = "idle";
}

// ─── Context Builder ──────────────────────────────────────────────────────────

type DataBundle = {
  etfFlows: Awaited<ReturnType<typeof getETFFlows>>["data"];
  sentiment: Awaited<ReturnType<typeof getNewsSentiment>>["data"];
  markets: Awaited<ReturnType<typeof getMarketSnapshots>>["data"];
  cryptoNews: Awaited<ReturnType<typeof getLatestCryptoNews>>;
  defiTVL: Awaited<ReturnType<typeof getDefiLlamaTVL>>;
};

function buildMarketContext(data: DataBundle): string {
  const { etfFlows, sentiment, markets, cryptoNews, defiTVL } = data;

  const etfSummary = etfFlows.length
    ? etfFlows
        .map(
          (f) =>
            `${f.ticker}: ${f.netInflow >= 0 ? "+" : ""}$${(f.netInflow / 1e6).toFixed(1)}M net (AUM: $${(f.totalAUM / 1e9).toFixed(1)}B)`,
        )
        .join("\n")
    : "ETF flow data unavailable";

  const sentimentSummary = sentiment.length
    ? sentiment
        .map((s) => `[${s.sentiment.toUpperCase()} ${(Math.abs(s.score) * 100).toFixed(0)}%] ${s.title} — ${s.source}`)
        .join("\n")
    : "Sentiment data unavailable";

  const marketsSummary = markets.length
    ? markets
        .map((m) => `${m.symbol}: $${m.price.toLocaleString()} (${m.change24h >= 0 ? "+" : ""}${m.change24h.toFixed(2)}% 24h)`)
        .join(", ")
    : "Market price data unavailable";

  const newsSummary = cryptoNews.length
    ? cryptoNews.slice(0, 5).map((n) => `• ${n.title} [${n.source}]`).join("\n")
    : "News data unavailable";

  const defiSummary = defiTVL.length
    ? defiTVL.slice(0, 5).map((p) => `${p.name}: $${(p.tvl / 1e9).toFixed(2)}B`).join(", ")
    : "DeFi TVL data unavailable";

  return `
TODAY'S MARKET INTELLIGENCE — ${new Date().toUTCString()}

SPOT BITCOIN & ETHEREUM ETF FLOWS:
${etfSummary}

AI NEWS SENTIMENT ANALYSIS:
${sentimentSummary}

CRYPTO MARKET PRICES:
${marketsSummary}

LATEST CRYPTO NEWS:
${newsSummary}

TOP DEFI PROTOCOLS BY TVL:
${defiSummary}
`.trim();
}

// ─── LLM Call ─────────────────────────────────────────────────────────────────

async function callLLM(
  context: string,
  data: DataBundle,
): Promise<{ title: string; summary: string; body: string; keyAssets: string[] }> {
  if (!config.OPENROUTER_API_KEY) {
    return buildDataDrivenNewsletter(data);
  }

  const systemPrompt = `You are Bloom AI's lead financial journalist — a sophisticated AI analyst covering crypto and institutional finance. Transform raw market data into compelling, institutional-grade "Smart Money" newsletters.

Your newsletters are:
- Written in clear, engaging English (no jargon without explanation)
- Data-driven with specific numbers and percentages from the provided data
- Insightful about CAUSE (why something is happening) not just EFFECT
- Actionable — what should readers consider?
- Concise yet comprehensive (400-600 words for body)

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "title": "Compelling headline (max 80 chars)",
  "summary": "One punchy sentence summarizing the key insight (max 150 chars)",
  "body": "Full newsletter body in markdown format (400-600 words)",
  "keyAssets": ["BTC", "ETH"]
}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bloom-ai.finance",
        "X-Title": "Bloom AI",
      },
      body: JSON.stringify({
        model: config.OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Based on this real-time market intelligence, write today's Smart Money newsletter:\n\n${context}` },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);

    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    const content = json.choices[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");

    return JSON.parse(content) as { title: string; summary: string; body: string; keyAssets: string[] };
  } catch (err) {
    console.warn("[Journalist] LLM call failed, using data-driven template:", err);
    return buildDataDrivenNewsletter(data);
  }
}

// ─── Data-Driven Template Newsletter ─────────────────────────────────────────
// Used when OpenRouter key is not configured. Uses real market data.

function buildDataDrivenNewsletter(data: DataBundle): {
  title: string;
  summary: string;
  body: string;
  keyAssets: string[];
} {
  const { etfFlows, sentiment, markets } = data;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const totalETFInflow = etfFlows.reduce((s, f) => s + f.netInflow, 0);
  const avgSentiment = sentiment.reduce((s, n) => s + n.score, 0) / (sentiment.length || 1);

  const btc = markets.find((m) => m.symbol === "BTC");
  const eth = markets.find((m) => m.symbol === "ETH");
  const sol = markets.find((m) => m.symbol === "SOL");

  const topInflow = [...etfFlows].sort((a, b) => b.netInflow - a.netInflow)[0];
  const bullishCount = sentiment.filter((s) => s.sentiment === "bullish").length;
  const bearishCount = sentiment.filter((s) => s.sentiment === "bearish").length;

  const regime = totalETFInflow > 100_000_000 ? "Risk-On" : totalETFInflow < -50_000_000 ? "Risk-Off" : "Neutral";
  const etfDirection = totalETFInflow >= 0 ? "inflows" : "outflows";
  const etfAbs = Math.abs(totalETFInflow);

  const title = `Smart Money ${dateStr}: ${regime} Signal — ETF ${etfDirection.charAt(0).toUpperCase() + etfDirection.slice(1)} Hit $${(etfAbs / 1e6).toFixed(0)}M`;
  const summary = `Spot Bitcoin & Ethereum ETFs recorded $${(etfAbs / 1e6).toFixed(0)}M net ${etfDirection} with ${bullishCount} bullish vs ${bearishCount} bearish signals across ${sentiment.length} monitored news items.`;

  const body = `## Market Regime: ${regime}

Today's institutional data points to a **${regime.toLowerCase()}** environment. Spot crypto ETF products recorded a combined **${totalETFInflow >= 0 ? "+" : ""}$${(totalETFInflow / 1e6).toFixed(1)}M** net flow across tracked products.
${topInflow ? `\nThe standout mover was **${topInflow.ticker}**, recording **${topInflow.netInflow >= 0 ? "+" : ""}$${(topInflow.netInflow / 1e6).toFixed(1)}M** in a single session against $${(topInflow.totalAUM / 1e9).toFixed(1)}B total AUM.` : ""}

## Price Action

${btc ? `**BTC** is trading at **$${btc.price.toLocaleString()}**, ${btc.change24h >= 0 ? "up" : "down"} ${Math.abs(btc.change24h).toFixed(2)}% in 24 hours.` : ""}
${eth ? `**ETH** sits at **$${eth.price.toLocaleString()}**, ${eth.change24h >= 0 ? "up" : "down"} ${Math.abs(eth.change24h).toFixed(2)}% over the same period.` : ""}
${sol ? `**SOL** is at **$${sol.price.toLocaleString()}** (${sol.change24h >= 0 ? "+" : ""}${sol.change24h.toFixed(2)}%).` : ""}

## Sentiment Breakdown

Our AI sentiment engine scanned ${sentiment.length} institutional news items:
- 🟢 **Bullish signals:** ${bullishCount} (${((bullishCount / (sentiment.length || 1)) * 100).toFixed(0)}%)
- 🔴 **Bearish signals:** ${bearishCount} (${((bearishCount / (sentiment.length || 1)) * 100).toFixed(0)}%)
- ⚪ **Neutral:** ${sentiment.length - bullishCount - bearishCount}

Overall sentiment score: **${(avgSentiment * 100).toFixed(0)}%** ${avgSentiment >= 0 ? "positive" : "negative"}.

${sentiment.slice(0, 3).map((s) => `> ${s.sentiment === "bullish" ? "🟢" : s.sentiment === "bearish" ? "🔴" : "⚪"} **${s.title}**`).join("\n")}

## Bloom AI Strategy Signal

Based on this regime analysis, the Bloom AI Strategist is signalling a **${regime.toLowerCase()}** portfolio posture. ${regime === "Risk-On" ? "Consider increased exposure to high-beta crypto assets via the BLOOM-MAG7 strategy." : regime === "Risk-Off" ? "Consider rotating to defensive positions with reduced altcoin exposure." : "Hold balanced positions across strategies while monitoring ETF flow shifts."}

---

*Bloom AI newsletters use real-time data from SoSoValue Terminal, SoDEX market feeds, and CryptoPanic. Not financial advice. [Powered by SoSoValue + SoDEX]*`;

  const keyAssets: string[] = [];
  if (btc) keyAssets.push("BTC");
  if (eth) keyAssets.push("ETH");
  if (sol) keyAssets.push("SOL");

  return { title, summary, body, keyAssets };
}
