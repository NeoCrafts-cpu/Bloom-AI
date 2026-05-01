import type { FastifyInstance } from "fastify";
import type { AgentState } from "@bloom-ai/types";
import {
  startJournalistAgent,
  stopJournalistAgent,
  runJournalistCycle,
} from "../agents/journalist/index.js";

const agentStates: Record<string, AgentState> = {
  journalist: { name: "journalist", status: "running" },
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
    return reply.code(400).send({ error: "Agent not triggerable" });
  });
}
