import type { FastifyInstance } from "fastify";
import type { AgentState, SSIIndex, SmartMoneyNewsletter, SentinelReport } from "@bloom-ai/types";
import {
  startJournalistAgent,
  stopJournalistAgent,
  runJournalistCycle,
  journalistStatus,
} from "../agents/journalist/index.js";
import {
  startChartAnalystAgent,
  stopChartAnalystAgent,
  runChartAnalystCycle,
  chartAnalystStatus,
} from "../agents/chartanalyst/index.js";
import {
  runStrategistCycle,
  strategistStatus,
} from "../agents/strategist/index.js";
import {
  runSentinelPreview,
  sentinelStatus,
} from "../agents/sentinel/index.js";
import { brokerStatus } from "../agents/broker/index.js";
import { newsletterStore } from "../store/newsletter.js";

function mapJournalistState(): AgentState {
  const status =
    journalistStatus.status === "error"
      ? "error"
      : journalistStatus.status === "running"
        ? "running"
        : "idle";
  return {
    name: "journalist",
    status,
    lastRun: journalistStatus.lastRun ?? undefined,
    message:
      journalistStatus.lastError ??
      (status === "running"
        ? "Polling SoSoValue Terminal API..."
        : journalistStatus.lastRun
          ? "Last cycle complete"
          : "Idle — polling on interval"),
  };
}

function mapChartAnalystState(): AgentState {
  const status =
    chartAnalystStatus.status === "error"
      ? "error"
      : chartAnalystStatus.status === "running"
        ? "running"
        : "idle";
  const warning = chartAnalystStatus.lastError?.includes("deterministic")
    ? chartAnalystStatus.lastError
    : null;
  return {
    name: "chartanalyst",
    status,
    lastRun: chartAnalystStatus.lastRun ?? undefined,
    message:
      (status === "error" ? chartAnalystStatus.lastError : warning) ??
      (status === "running"
        ? "Analyzing SoDEX klines..."
        : chartAnalystStatus.lastRun
          ? "Last analysis complete"
          : "Idle until next cycle"),
  };
}

function mapStrategistState(): AgentState {
  const status =
    strategistStatus.status === "error"
      ? "error"
      : strategistStatus.status === "running"
        ? "running"
        : "idle";
  return {
    name: "strategist",
    status,
    lastRun: strategistStatus.lastRun ?? undefined,
    message:
      strategistStatus.lastError ??
      (status === "running"
        ? "Generating SSI index from newsletter..."
        : strategistStatus.lastStrategyId
          ? `Signal generated — ${strategistStatus.lastStrategyId}`
          : "Idle until pipeline trigger"),
  };
}

function mapBrokerState(): AgentState {
  const status =
    brokerStatus.status === "error"
      ? "error"
      : brokerStatus.status === "running"
        ? "running"
        : "idle";
  return {
    name: "broker",
    status,
    lastRun: brokerStatus.lastRun ?? undefined,
    message:
      brokerStatus.lastError ??
      brokerStatus.lastMessage,
  };
}

function mapSentinelState(preview?: SentinelReport | null): AgentState {
  const status =
    sentinelStatus.status === "error"
      ? "error"
      : sentinelStatus.status === "running"
        ? "running"
        : "idle";
  const report = preview ?? sentinelStatus.lastPreview;
  return {
    name: "sentinel",
    status,
    lastRun: sentinelStatus.lastRun ?? undefined,
    message:
      sentinelStatus.lastError ??
      (status === "running"
        ? "Running risk checks..."
        : report
          ? report.passed
            ? `${report.checks.length} checks passed — ready for copy-trade`
            : "Risk preview failed — review limits"
          : "Passive — checks on copy-trade confirmation"),
  };
}

const agentStates: Record<string, AgentState> = {
  journalist: mapJournalistState(),
  chartanalyst: mapChartAnalystState(),
  strategist: mapStrategistState(),
  broker: mapBrokerState(),
  sentinel: mapSentinelState(),
};

function syncLiveAgentStates() {
  agentStates.journalist = mapJournalistState();
  agentStates.chartanalyst = mapChartAnalystState();
  agentStates.strategist = mapStrategistState();
  agentStates.broker = mapBrokerState();
  agentStates.sentinel = mapSentinelState();
}

export async function agentRouter(app: FastifyInstance) {
  app.get("/", async () => {
    syncLiveAgentStates();
    return { data: Object.values(agentStates) };
  });

  app.post<{ Params: { name: string } }>("/:name/start", async (req) => {
    const { name } = req.params;
    if (name === "journalist") {
      startJournalistAgent();
      agentStates.journalist = mapJournalistState();
    }
    if (name === "chartanalyst") {
      startChartAnalystAgent();
      agentStates.chartanalyst = mapChartAnalystState();
    }
    return { data: agentStates[name] };
  });

  app.post<{ Params: { name: string } }>("/:name/stop", async (req) => {
    const { name } = req.params;
    if (name === "journalist") {
      stopJournalistAgent();
      agentStates.journalist = { name: "journalist", status: "paused", message: "Agent paused" };
    }
    if (name === "chartanalyst") {
      stopChartAnalystAgent();
      agentStates.chartanalyst = { name: "chartanalyst", status: "paused", message: "Agent paused" };
    }
    return { data: agentStates[name] };
  });

  app.post<{ Params: { name: string } }>("/:name/trigger", async (req, reply) => {
    const { name } = req.params;
    if (name === "journalist") {
      agentStates.journalist = { name: "journalist", status: "running", message: "Running analysis cycle..." };
      try {
        await runJournalistCycle();
        agentStates.journalist = mapJournalistState();
        return { data: agentStates.journalist };
      } catch (err) {
        agentStates.journalist = {
          name: "journalist",
          status: "error",
          lastRun: new Date().toISOString(),
          message: (err as Error).message,
        };
        return { data: agentStates.journalist };
      }
    }
    if (name === "chartanalyst") {
      agentStates.chartanalyst = { name: "chartanalyst", status: "running", message: "Analyzing klines..." };
      try {
        const newsletter = await runChartAnalystCycle();
        agentStates.chartanalyst = mapChartAnalystState();
        if (!newsletter) {
          return reply.code(500).send({
            error: chartAnalystStatus.lastError ?? "Chart analysis failed",
            agent: agentStates.chartanalyst,
          });
        }
        return { data: newsletter, agent: agentStates.chartanalyst };
      } catch (err) {
        agentStates.chartanalyst = {
          name: "chartanalyst",
          status: "error",
          lastRun: new Date().toISOString(),
          message: (err as Error).message,
        };
        return reply.code(500).send({
          error: (err as Error).message,
          agent: agentStates.chartanalyst,
        });
      }
    }
    return reply.code(400).send({ error: "Agent not triggerable" });
  });

  app.get("/chartanalyst/status", async () => {
    return { data: chartAnalystStatus };
  });

  // Full pipeline: Journalist → Chart Analyst → Strategist → Sentinel preview → Broker ready
  app.post("/pipeline/trigger", async () => {
    const now = new Date().toISOString();
    let pipelineFailed = false;
    let pipelineNewsletter: SmartMoneyNewsletter | null = null;
    let pipelineStrategy: SSIIndex | null = null;
    let sentinelDryRun: SentinelReport | null = null;

    agentStates.journalist = { name: "journalist", status: "running", lastRun: now, message: "Running analysis cycle..." };
    try {
      await runJournalistCycle();
      agentStates.journalist = mapJournalistState();
      if (journalistStatus.status === "error") pipelineFailed = true;
    } catch (err) {
      pipelineFailed = true;
      agentStates.journalist = {
        name: "journalist",
        status: "error",
        lastRun: now,
        message: journalistStatus.lastError ?? (err as Error).message,
      };
    }

    agentStates.chartanalyst = { name: "chartanalyst", status: "running", lastRun: now, message: "Analyzing klines..." };
    try {
      await runChartAnalystCycle();
      agentStates.chartanalyst = mapChartAnalystState();
      if (chartAnalystStatus.status === "error") pipelineFailed = true;
    } catch (err) {
      pipelineFailed = true;
      agentStates.chartanalyst = {
        name: "chartanalyst",
        status: "error",
        lastRun: now,
        message: chartAnalystStatus.lastError ?? (err as Error).message,
      };
    }

    if (pipelineFailed) {
      agentStates.strategist = { name: "strategist", status: "idle", lastRun: now, message: "Skipped — upstream agent error" };
      agentStates.sentinel = { name: "sentinel", status: "idle", lastRun: now, message: "Skipped — pipeline incomplete" };
      brokerStatus.lastMessage = "Awaiting successful pipeline run";
      agentStates.broker = mapBrokerState();
      return {
        data: Object.values(agentStates),
        pipeline: { newsletter: null, strategy: null, sentinelDryRun: null, failed: true },
      };
    }

    pipelineNewsletter = newsletterStore.getLatest() ?? null;

    agentStates.strategist = { name: "strategist", status: "running", lastRun: now, message: "Generating SSI index..." };
    if (!pipelineNewsletter) {
      agentStates.strategist = { name: "strategist", status: "error", lastRun: now, message: "No newsletter available from Journalist" };
    } else {
      pipelineStrategy = await runStrategistCycle(pipelineNewsletter);
      agentStates.strategist = mapStrategistState();
      if (!pipelineStrategy) pipelineFailed = true;
    }

    if (pipelineStrategy) {
      agentStates.sentinel = { name: "sentinel", status: "running", lastRun: now, message: "Running risk preview..." };
      sentinelDryRun = await runSentinelPreview(pipelineStrategy.id);
      agentStates.sentinel = mapSentinelState(sentinelDryRun);
    } else {
      agentStates.sentinel = { name: "sentinel", status: "idle", lastRun: now, message: "Skipped — no strategy generated" };
    }

    brokerStatus.lastMessage = pipelineStrategy
      ? "Ready for confirmation — execute via Copy Trade"
      : "Awaiting strategy signal from pipeline";
    agentStates.broker = mapBrokerState();

    return {
      data: Object.values(agentStates),
      pipeline: {
        newsletter: pipelineNewsletter,
        strategy: pipelineStrategy,
        sentinelDryRun,
        failed: pipelineFailed,
      },
    };
  });
}
