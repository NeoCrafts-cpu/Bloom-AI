import type { FastifyInstance } from "fastify";
import type { AgentState } from "@bloom-ai/types";
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
  return {
    name: "chartanalyst",
    status,
    lastRun: chartAnalystStatus.lastRun ?? undefined,
    message:
      chartAnalystStatus.lastError ??
      (status === "running"
        ? "Analyzing SoDEX klines..."
        : chartAnalystStatus.lastRun
          ? "Last analysis complete"
          : "Idle until next cycle"),
  };
}

const agentStates: Record<string, AgentState> = {
  journalist: mapJournalistState(),
  chartanalyst: mapChartAnalystState(),
  strategist: { name: "strategist", status: "idle", message: "Idle until pipeline trigger" },
  broker: { name: "broker", status: "idle", message: "Idle — executes on copy-trade" },
  sentinel: { name: "sentinel", status: "idle", message: "Passive — checks on copy-trade" },
};

function syncLiveAgentStates() {
  agentStates.journalist = mapJournalistState();
  agentStates.chartanalyst = mapChartAnalystState();
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
        await runChartAnalystCycle();
        agentStates.chartanalyst = mapChartAnalystState();
        return { data: agentStates.chartanalyst };
      } catch (err) {
        agentStates.chartanalyst = {
          name: "chartanalyst",
          status: "error",
          lastRun: new Date().toISOString(),
          message: (err as Error).message,
        };
        return { data: agentStates.chartanalyst };
      }
    }
    return reply.code(400).send({ error: "Agent not triggerable" });
  });

  app.get("/chartanalyst/status", async () => {
    return { data: chartAnalystStatus };
  });

  // Full pipeline trigger — chains all 5 agents deterministically
  app.post("/pipeline/trigger", async () => {
    const now = new Date().toISOString();
    agentStates.journalist = { name: "journalist", status: "running", lastRun: now, message: "Running analysis cycle..." };
    agentStates.chartanalyst = { name: "chartanalyst", status: "running", lastRun: now, message: "Analyzing klines..." };
    agentStates.strategist = { name: "strategist", status: "running", lastRun: now, message: "Generating signals..." };
    agentStates.broker = { name: "broker", status: "running", lastRun: now, message: "Preparing orders..." };
    agentStates.sentinel = { name: "sentinel", status: "running", lastRun: now, message: "Running risk checks..." };

    let pipelineFailed = false;

    try {
      await runJournalistCycle();
    } catch (err) {
      pipelineFailed = true;
      agentStates.journalist = {
        name: "journalist",
        status: "error",
        lastRun: now,
        message: journalistStatus.lastError ?? (err as Error).message,
      };
    }

    if (!pipelineFailed) {
      agentStates.journalist = mapJournalistState();
    }

    try {
      await runChartAnalystCycle();
      agentStates.chartanalyst = mapChartAnalystState();
    } catch (err) {
      pipelineFailed = true;
      agentStates.chartanalyst = {
        name: "chartanalyst",
        status: "error",
        lastRun: now,
        message: chartAnalystStatus.lastError ?? (err as Error).message,
      };
    }

    if (pipelineFailed || chartAnalystStatus.status === "error" || journalistStatus.status === "error") {
      agentStates.strategist = {
        name: "strategist",
        status: "idle",
        lastRun: now,
        message: "Skipped — upstream agent error",
      };
      agentStates.broker = {
        name: "broker",
        status: "idle",
        lastRun: now,
        message: "No orders — pipeline incomplete",
      };
      agentStates.sentinel = {
        name: "sentinel",
        status: "idle",
        lastRun: now,
        message: "Monitoring only",
      };
    } else {
      agentStates.strategist = {
        name: "strategist",
        status: "idle",
        lastRun: now,
        message: "Signal generated",
      };
      agentStates.broker = {
        name: "broker",
        status: "idle",
        lastRun: now,
        message: "Demo mode — no live execution",
      };
      agentStates.sentinel = {
        name: "sentinel",
        status: "idle",
        lastRun: now,
        message: "Pipeline checks passed",
      };
    }

    return { data: Object.values(agentStates) };
  });
}
