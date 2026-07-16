import { config } from "../config.js";
import { journalistStatus } from "../agents/journalist/index.js";
import { chartAnalystStatus } from "../agents/chartanalyst/index.js";
import { strategistStatus } from "../agents/strategist/index.js";
import { brokerStatus } from "../agents/broker/index.js";
import { sentinelStatus } from "../agents/sentinel/index.js";
import { newsletterStore } from "../store/newsletter.js";
import { tradeStore } from "../store/tradeStore.js";
import { strategyStore } from "../agents/strategist/index.js";
import { getETFFlows, getMarketSnapshots } from "../services/sosovalue.js";
import { getSpotTickers, getOrderBook, getSpotKlines } from "../services/sodex.js";
import { getSodexWsRelayStatus } from "../services/sodexWsRelay.js";
import { getRedis } from "./redis.js";

const bootTime = Date.now();

async function probeSosovalue(): Promise<{ ok: boolean; message: string }> {
  if (!config.SOSOVALUE_API_KEY) {
    return { ok: false, message: "SOSOVALUE_API_KEY not configured" };
  }
  try {
    const result = await getETFFlows();
    if (result.data.length > 0) {
      return { ok: true, message: `${result.data.length} ETF flow rows` };
    }
    return { ok: false, message: "SoSoValue connected but ETF flows empty" };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

async function probeSodex(): Promise<{ ok: boolean; message: string; klines: number }> {
  try {
    const [tickers, orderbook, klines] = await Promise.all([
      getSpotTickers(),
      getOrderBook("vBTC_vUSDC", 5),
      getSpotKlines("vBTC_vUSDC", "1h", 3),
    ]);
    const hasTickers = tickers.length > 0;
    const hasBook = orderbook.bids.length > 0 || orderbook.asks.length > 0;
    const hasKlines = klines.length > 0;
    if (hasTickers && (hasBook || hasKlines)) {
      return {
        ok: true,
        message: `${tickers.length} tickers, ${klines.length} klines`,
        klines: klines.length,
      };
    }
    return { ok: false, message: "SoDEX reachable but market data empty", klines: 0 };
  } catch (err) {
    return { ok: false, message: (err as Error).message, klines: 0 };
  }
}

export async function getHealthReport() {
  const newsletters = newsletterStore.getAll();
  const strategies = strategyStore.getAll();
  const perf = tradeStore.getPerformance();
  const executionMode = config.SODEX_API_PRIVATE_KEY && config.SODEX_API_KEY_NAME ? "live" : "simulated";

  const [sosovalueProbe, sodexProbe, pricesResult] = await Promise.all([
    probeSosovalue(),
    probeSodex(),
    getMarketSnapshots().catch(() => null),
  ]);

  const journalistFresh =
    journalistStatus.lastRun !== null &&
    Date.now() - new Date(journalistStatus.lastRun).getTime() < config.JOURNALIST_INTERVAL_MS * 2;

  const integrationsOk = sosovalueProbe.ok && sodexProbe.ok && pricesResult?.source === "sodex";
  const ready = integrationsOk && journalistFresh && newsletters.length > 0;

  return {
    status: ready ? "ok" : integrationsOk ? "degraded" : "degraded",
    ts: Date.now(),
    uptimeSeconds: Math.floor((Date.now() - bootTime) / 1000),
    executionMode,
    ready,
    network: config.SODEX_NETWORK,
    chainId: config.SODEX_CHAIN_ID,
    features: {
      perpsCopy: config.SODEX_ENABLE_PERPS_COPY,
      twap: config.SODEX_ENABLE_TWAP,
      redis: !!getRedis(),
    },
    integrations: {
      sosovalue: sosovalueProbe,
      sodex: sodexProbe,
      sodexWs: getSodexWsRelayStatus(),
      priceSource: pricesResult?.source ?? "unknown",
    },
    journalist: {
      status: journalistStatus.status,
      lastRun: journalistStatus.lastRun,
      lastError: journalistStatus.lastError,
      cycleCount: journalistStatus.cycleCount,
      fresh: journalistFresh,
    },
    chartAnalyst: {
      status: chartAnalystStatus.status,
      lastRun: chartAnalystStatus.lastRun,
      lastError: chartAnalystStatus.lastError,
    },
    strategist: {
      status: strategistStatus.status,
      lastRun: strategistStatus.lastRun,
      lastStrategyId: strategistStatus.lastStrategyId,
      cycleCount: strategistStatus.cycleCount,
    },
    broker: {
      status: brokerStatus.status,
      lastRun: brokerStatus.lastRun,
      lastMessage: brokerStatus.lastMessage,
    },
    sentinel: {
      status: sentinelStatus.status,
      lastRun: sentinelStatus.lastRun,
      lastPreviewPassed: sentinelStatus.lastPreview?.passed ?? null,
    },
    newsletterCount: newsletters.length,
    strategyCount: strategies.length,
    tradeStats: {
      totalTrades: perf.totalTrades,
      blockedTrades: perf.blockedTrades,
      liveTrades: perf.liveTrades,
      simulatedTrades: perf.simulatedTrades,
    },
    env: {
      openrouter: !!config.OPENROUTER_API_KEY,
      sosovalue: !!config.SOSOVALUE_API_KEY,
      sodexPrivateKey: !!config.SODEX_API_PRIVATE_KEY,
      sodexKeyName: !!config.SODEX_API_KEY_NAME,
      sodexKeyAddress: !!config.SODEX_API_KEY_ADDRESS,
    },
  };
}
