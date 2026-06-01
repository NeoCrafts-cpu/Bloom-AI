import type { FastifyInstance } from "fastify";
import type { SignalSource } from "@bloom-ai/types";
import { signalLedger } from "../store/signalLedger.js";

export async function ledgerRouter(app: FastifyInstance) {
  app.get<{ Querystring: { limit?: string; source?: SignalSource } }>("/signals", async (req) => {
    const limit = Math.min(parseInt(req.query.limit ?? "50", 10), 100);
    return { data: signalLedger.getSignals(limit, req.query.source) };
  });

  app.get<{ Params: { id: string } }>("/signals/:id", async (req, reply) => {
    const signal = signalLedger.getSignalById(req.params.id);
    if (!signal) return reply.code(404).send({ error: "Signal not found" });
    const outcomes = signalLedger.getOutcomes(100).filter((o) => o.signalId === signal.id);
    return { data: { signal, outcomes } };
  });

  app.get<{ Querystring: { limit?: string } }>("/outcomes", async (req) => {
    const limit = Math.min(parseInt(req.query.limit ?? "50", 10), 100);
    return { data: signalLedger.getOutcomes(limit) };
  });

  app.get("/stats", async () => {
    return { data: signalLedger.getStats() };
  });
}
