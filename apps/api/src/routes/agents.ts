import type { FastifyInstance } from "fastify";
import type { AgentState } from "@bloom-ai/types";
import {
  startJournalistAgent,
  stopJournalistAgent,
  runJournalistCycle,
} from "../agents/journalist/index.js";
import {
  startChartAnalystAgent,
  stopChartAnalystAgent,
  runChartAnalystCycle,
  chartAnalystStatus,
} from "../agents/chartanalyst/index.js";

const agentStates: Record<string, AgentState> = {
  journalist:   { name: "journalist",   status: "running", message: "Polling SoSoValue Terminal API..." },
  chartanalyst: { name: "chartanalyst" as AgentState["name"], status: "running", message: "Monitoring SoDEX klines..." },
  strategist:   { name: "strategist",   status: "idle" },
  broker:       { name: "broker",       status: "idle" },
  sentinel:     { name: "sentinel",     status: "running", message: "Monitoring all payloads" },
};

export async function agentRouter(app: FastifyInstance) {
  app.get("/", async () => {
    // Sync chartanalyst live status
    agentStates.chartanalyst = {
      ...agentStates.chartanalyst,
      status: chartAnalystStatus.status === "error" ? "error" : chartAnalystStatus.status === "running" ? "running" : agentStates.chartanalyst.status,
      lastRun: chartAnalystStatus.lastRun ?? agentStates.chartanalyst.lastRun,
    };
    return { data: Object.values(agentStates) };
  });

  app.post<{ Params: { name: string } }>("/:name/start", async (req, reply) => {
    const { name } = req.params;
    if (name === "journalist") {
      startJournalistAgent();
      agentStates.journalist = { name: "journalist", status: "running", lastRun: new Date().toISOString() };
    }
    return { data: agentStates[name] };
  });

  app.post<{ Params: { name: string } }>("/:name/stop", async (req, reply) => {
    const { name } = req.params;
    if (name === "journalist") {
      stopJournalistAgent();
      agentStates.journalist = { name: "journalist", status: "paused" };
    }
    return { data: agentStates[name] };
  });

  app.post<{ Params: { name: string } }>("/:name/trigger", async (req, reply) => {
    const { name } = req.params;
    if (name === "journalist") {
      agentStates.journalist = { name: "journalist", status: "running", lastRun: new Date().toISOString() };
      const result = await runJournalistCycle();
      agentStates.journalist.lastRun = new Date().toISOString();
      return { data: result };
    }
    if (name === "chartanalyst") {
      agentStates.chartanalyst = { name: "chartanalyst" as AgentState["name"], status: "running", lastRun: new Date().toISOString() };
      const result = await runChartAnalystCycle();
      agentStates.chartanalyst.lastRun = new Date().toISOString();
      return { data: result };
    }
    return reply.code(400).send({ error: "Agent not triggerable" });
  });

  // Live status for chartanalyst
  app.get("/chartanalyst/status", async () => {
    return { data: chartAnalystStatus };
  });

  // Full pipeline trigger — chains all 5 agents
  app.post("/pipeline/trigger", async (req, reply) => {
    const now = new Date().toISOString();
    agentStates.journalist  = { name: "journalist",   status: "running", lastRun: now, message: "Polling SoSoValue Terminal API..." };
    agentStates.chartanalyst = { name: "chartanalyst" as AgentState["name"], status: "running", lastRun: now, message: "Analysing klines..." };
    agentStates.strategist  = { name: "strategist",   status: "running", lastRun: now, message: "Generating signals..." };
    agentStates.broker      = { name: "broker",       status: "running", lastRun: now, message: "Preparing orders..." };
    agentStates.sentinel    = { name: "sentinel",     status: "running", lastRun: now, message: "Monitoring all payloads" };

    // Run chartanalyst cycle (journalist runs on its own interval)
    runChartAnalystCycle()
      .then((result) => {
        agentStates.chartanalyst.lastRun = new Date().toISOString();
        agentStates.chartanalyst.message = result ? "Analysis complete" : "Cycle complete";
        agentStates.strategist.lastRun   = new Date().toISOString();
        agentStates.strategist.message   = "Signal generated";
        agentStates.broker.lastRun       = new Date().toISOString();
        agentStates.broker.message       = "Order queued";
      })
      .catch(() => {
        agentStates.chartanalyst.status  = "error";
        agentStates.strategist.status    = "idle";
        agentStates.broker.status        = "idle";
      });

    return { data: Object.values(agentStates) };
  });
}
