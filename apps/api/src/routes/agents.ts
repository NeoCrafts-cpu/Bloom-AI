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
  journalist: { name: "journalist", status: "running" },
  chartanalyst: { name: "chartanalyst" as AgentState["name"], status: "idle" },
  strategist: { name: "strategist", status: "idle" },
  broker: { name: "broker", status: "idle" },
  sentinel: { name: "sentinel", status: "idle" },
};

export async function agentRouter(app: FastifyInstance) {
  app.get("/", async () => {
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
}
