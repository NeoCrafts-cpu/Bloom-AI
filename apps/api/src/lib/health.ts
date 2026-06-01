import { config } from "../config.js";
import { journalistStatus } from "../agents/journalist/index.js";
import { chartAnalystStatus } from "../agents/chartanalyst/index.js";
import { newsletterStore } from "../store/newsletter.js";
import { tradeStore } from "../store/tradeStore.js";

const bootTime = Date.now();

export function getHealthReport() {
  const newsletters = newsletterStore.getAll();
  const perf = tradeStore.getPerformance();
  const executionMode = config.SODEX_API_PRIVATE_KEY ? "live" : "simulated";

  const journalistFresh =
    journalistStatus.lastRun !== null &&
    Date.now() - new Date(journalistStatus.lastRun).getTime() < config.JOURNALIST_INTERVAL_MS * 2;

  const ready =
    !!process.env.SOSOVALUE_API_KEY &&
    journalistFresh &&
    newsletters.length > 0;

  return {
    status: ready ? "ok" : "degraded",
    ts: Date.now(),
    uptimeSeconds: Math.floor((Date.now() - bootTime) / 1000),
    executionMode,
    ready,
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
    newsletterCount: newsletters.length,
    tradeStats: {
      totalTrades: perf.totalTrades,
      blockedTrades: perf.blockedTrades,
      liveTrades: perf.liveTrades,
      simulatedTrades: perf.simulatedTrades,
    },
    env: {
      openrouter: !!config.OPENROUTER_API_KEY,
      sosovalue: !!process.env.SOSOVALUE_API_KEY,
      sodexPrivateKey: !!process.env.SODEX_API_PRIVATE_KEY,
      sodexKeyAddress: !!process.env.SODEX_API_KEY_ADDRESS,
    },
  };
}
