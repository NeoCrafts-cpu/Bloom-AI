import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { newsletterRouter } from "./routes/newsletter.js";
import { strategyRouter } from "./routes/strategy.js";
import { copyTradeRouter } from "./routes/copyTrade.js";
import { marketRouter } from "./routes/market.js";
import { agentRouter } from "./routes/agents.js";
import { mcpRouter } from "./routes/mcp.js";
import { ledgerRouter } from "./routes/ledger.js";
import { socialRouter } from "./routes/social.js";
import { startJournalistAgent } from "./agents/journalist/index.js";
import { startChartAnalystAgent } from "./agents/chartanalyst/index.js";
import { wsManager } from "./ws/manager.js";
import { startSodexWsRelay } from "./services/sodexWsRelay.js";
import { startAlertEngine } from "./services/alerts.js";
import { getRedis } from "./lib/redis.js";

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss" },
    },
  },
});

await app.register(cors, {
  origin: [config.WEB_URL, "http://localhost:3000"],
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
  credentials: true,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

await app.register(websocket);

// Routes
await app.register(newsletterRouter, { prefix: "/api/newsletters" });
await app.register(strategyRouter, { prefix: "/api/strategies" });
await app.register(copyTradeRouter, { prefix: "/api/copy-trade" });
await app.register(marketRouter, { prefix: "/api/market" });
await app.register(agentRouter, { prefix: "/api/agents" });
await app.register(mcpRouter, { prefix: "/api/mcp" });
await app.register(ledgerRouter, { prefix: "/api/ledger" });
await app.register(socialRouter, { prefix: "/api/social" });

// ── Standalone sentinel & broker endpoints (frontend shortcuts) ─────────────
app.post<{ Body: import("@bloom-ai/types").CopyTradeIntent }>(
  "/api/sentinel/check",
  async (req) => {
    const { runSentinel } = await import("./agents/sentinel/index.js");
    return { data: runSentinel(req.body) };
  },
);

app.post<{ Body: import("@bloom-ai/types").CopyTradeIntent }>(
  "/api/broker/execute",
  async (req, reply) => {
    const intent = req.body;
    const { config } = await import("./config.js");
    const { runSentinel } = await import("./agents/sentinel/index.js");
    const { executeCopyTrade } = await import("./agents/broker/index.js");
    const { tradeStore } = await import("./store/tradeStore.js");
    const { verifyCopyTradeAuth } = await import("./signing/copyTradeAuth.js");

    const auth = verifyCopyTradeAuth({
      strategyId: intent.strategyId,
      allocationUSD: intent.allocationUSD,
      maxSlippageBps: intent.maxSlippageBps,
      userAddress: intent.userAddress,
      deadline: intent.deadline ?? 0,
      userSignature: intent.userSignature ?? "",
    });
    if (!auth.valid) {
      tradeStore.recordError(
        { strategyId: intent.strategyId, userAddress: intent.userAddress },
        auth.error ?? "Copy-trade authorization failed",
      );
      return reply.code(401).send({ error: auth.error ?? "Copy-trade authorization failed" });
    }

    const sentinel = runSentinel(intent);
    if (!sentinel.passed) {
      tradeStore.recordSentinelBlock(sentinel, {
        strategyId: intent.strategyId,
        userAddress: intent.userAddress,
      });
      wsManager.broadcast({ type: "SENTINEL_TRIP", payload: sentinel, timestamp: new Date().toISOString() });
      return reply.code(422).send({ data: { sentinelStatus: "blocked", sentinelReport: sentinel } });
    }

    try {
      const result = await executeCopyTrade(intent);
      const simulated = !config.SODEX_API_PRIVATE_KEY || !config.SODEX_API_KEY_NAME;
      tradeStore.recordExecution(intent, result, simulated);
      return { data: { ...result, simulated } };
    } catch (err) {
      tradeStore.recordError(
        { strategyId: intent.strategyId, userAddress: intent.userAddress },
        (err as Error).message,
      );
      return reply.code(500).send({ error: (err as Error).message });
    }
  },
);

// SSE — newsletter stream (GET /api/newsletters/stream)
app.get("/api/newsletters/stream", async (req, reply) => {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const send = (data: unknown) => {
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send current newsletters immediately
  const { newsletterStore } = await import("./store/newsletter.js");
  const initial = newsletterStore.getAll();
  if (initial.length > 0) send({ type: "INITIAL", data: initial });

  // Bridge WS broadcasts to SSE
  const client = { send: (raw: string) => { reply.raw.write(`data: ${raw}\n\n`); }, readyState: 1 };
  wsManager.addClient(client);

  // Heartbeat to keep connection alive
  const hb = setInterval(() => reply.raw.write(": heartbeat\n\n"), 15000);

  req.raw.on("close", () => {
    clearInterval(hb);
    wsManager.removeClient(client);
  });

  // Never resolve — SSE keeps connection open
  return new Promise(() => {});
});

// WebSocket hub — live event stream
app.get("/ws", { websocket: true }, (socket) => {
  const client = {
    send: (data: string) => socket.socket.send(data),
    readyState: 1 as number,
  };
  wsManager.addClient(client);
  socket.on("close", () => {
    client.readyState = 3;
    wsManager.removeClient(client);
  });
});

app.get("/health", async () => {
  const { getHealthReport } = await import("./lib/health.js");
  return getHealthReport();
});

// Start
try {
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
  app.log.info(`Bloom AI API listening on port ${config.PORT}`);

  // Kick off background agents + relays
  getRedis();
  startJournalistAgent();
  startChartAnalystAgent();
  startSodexWsRelay();
  startAlertEngine();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
