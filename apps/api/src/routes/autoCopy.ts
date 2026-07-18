import type { FastifyInstance } from "fastify";
import { verifyAutoCopyGrant } from "../signing/autoCopyAuth.js";
import { autoCopyStore } from "../store/autoCopyStore.js";

interface EnableBody {
  userAddress: string;
  maxAllocationUSD: number;
  maxDailyUSD: number;
  maxSlippageBps: number;
  venue?: "spot" | "perps";
  expiresAt: number;
  nonce: number;
  signature: string;
}

export async function autoCopyRouter(app: FastifyInstance) {
  app.get<{ Params: { address: string } }>("/:address", async (req) => {
    const sub = autoCopyStore.getByAddress(req.params.address);
    return {
      data: sub,
      runs: autoCopyStore.getRuns(req.params.address, 20),
    };
  });

  app.get<{ Params: { address: string } }>("/:address/runs", async (req) => {
    return { data: autoCopyStore.getRuns(req.params.address, 50) };
  });

  app.post<{ Body: EnableBody }>("/enable", async (req, reply) => {
    const body = req.body;
    if (!body?.userAddress || !body.signature) {
      return reply.code(400).send({ error: "userAddress and signature required" });
    }
    const venue = body.venue === "perps" ? "perps" : "spot";
    const grant = {
      userAddress: body.userAddress,
      maxAllocationUSD: Number(body.maxAllocationUSD),
      maxDailyUSD: Number(body.maxDailyUSD),
      maxSlippageBps: Number(body.maxSlippageBps) || 50,
      venue,
      expiresAt: Number(body.expiresAt),
      nonce: Number(body.nonce),
    };
    const auth = verifyAutoCopyGrant(grant, body.signature);
    if (!auth.valid) {
      return reply.code(401).send({ error: auth.error ?? "Invalid Auto-Copy grant" });
    }

    const sub = autoCopyStore.enable({
      userAddress: grant.userAddress,
      maxAllocationUSD: grant.maxAllocationUSD,
      maxDailyUSD: grant.maxDailyUSD,
      maxSlippageBps: grant.maxSlippageBps,
      venue,
      grantSignature: body.signature,
      grantExpiresAt: grant.expiresAt,
      grantNonce: grant.nonce,
    });

    return {
      data: sub,
      message: "Auto-Copy enabled — new pipeline strategies will execute within your limits",
    };
  });

  app.post<{ Body: { userAddress: string } }>("/disable", async (req, reply) => {
    const address = req.body?.userAddress;
    if (!address) return reply.code(400).send({ error: "userAddress required" });
    const sub = autoCopyStore.disable(address);
    if (!sub) return reply.code(404).send({ error: "No Auto-Copy subscription found" });
    return { data: sub, message: "Auto-Copy disabled" };
  });
}
