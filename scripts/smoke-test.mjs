#!/usr/bin/env node
/**
 * Bloom AI smoke test — verifies core API endpoints.
 * Usage: API_URL=http://localhost:4000 node scripts/smoke-test.mjs
 * Optional: REQUIRE_SOSOVALUE=1 RUN_PIPELINE=1 node scripts/smoke-test.mjs
 */

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const REQUIRE_SOSOVALUE = process.env.REQUIRE_SOSOVALUE === "1";
const RUN_PIPELINE = process.env.RUN_PIPELINE === "1";

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (err) {
    console.error(`✗ ${name}: ${(err).message}`);
    return false;
  }
}

async function main() {
  console.log(`Smoke testing ${API_URL}\n`);
  let passed = 0;
  let total = 0;

  const tests = [
    ["GET /health", async () => {
      const res = await fetch(`${API_URL}/health`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!data.status) throw new Error("missing status");
      if (!data.executionMode) throw new Error("missing executionMode");
      if (!data.integrations?.sodex) throw new Error("missing sodex integration probe");
      if (!data.integrations?.sosovalue) throw new Error("missing sosovalue integration probe");
      if (data.executionMode === "live" && !data.env?.sodexKeyName) {
        throw new Error("live execution requires SODEX_API_KEY_NAME");
      }
      if (REQUIRE_SOSOVALUE && !data.integrations.sosovalue.ok) {
        throw new Error(`SoSoValue probe failed: ${data.integrations.sosovalue.message}`);
      }
      if (!data.integrations.sodex.ok) {
        throw new Error(`SoDEX probe failed: ${data.integrations.sodex.message}`);
      }
    }],
    ["GET /api/market/prices", async () => {
      const res = await fetch(`${API_URL}/api/market/prices`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data)) throw new Error("missing data array");
      if (!data.meta?.status) throw new Error("missing meta.status");
      const btc = data.data.find((p) => p.symbol === "BTC");
      if (!btc || typeof btc.price !== "number" || btc.price <= 0) {
        throw new Error("missing valid BTC price");
      }
      if (data.meta.source === "seed" || btc.price === 97420) {
        throw new Error("prices appear to be seed data — SoDEX parsing may be broken");
      }
    }],
    ["GET /api/market/sentiment", async () => {
      const res = await fetch(`${API_URL}/api/market/sentiment?limit=3`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data)) throw new Error("missing data array");
      if (!data.meta?.status) throw new Error("missing meta.status");
    }],
    ["GET /api/market/etf-flows", async () => {
      const res = await fetch(`${API_URL}/api/market/etf-flows`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data)) throw new Error("missing data array");
      if (REQUIRE_SOSOVALUE && data.data.length === 0) {
        throw new Error("SoSoValue ETF flows empty");
      }
    }],
    ["GET /api/market/etf-history", async () => {
      const res = await fetch(`${API_URL}/api/market/etf-history?symbol=BTC&limit=30`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data)) throw new Error("missing data array");
      if (!data.meta?.status) throw new Error("missing meta.status");
    }],
    ["GET /api/market/fundraising/ETH", async () => {
      const res = await fetch(`${API_URL}/api/market/fundraising/ETH`);
      if (!res.ok) throw new Error(`status ${res.status} (expected 200 graceful envelope)`);
      const data = await res.json();
      if (!("meta" in data) || !data.meta?.status) throw new Error("missing meta.status");
    }],
    ["GET /api/market/klines/BTC", async () => {
      const res = await fetch(`${API_URL}/api/market/klines/BTC?interval=1h&limit=24`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data)) throw new Error("missing data array");
      if (!data.meta?.status) throw new Error("missing meta.status");
      if (data.data.length === 0) throw new Error("expected SoDEX OHLCV bars");
      const bar = data.data[0];
      if (!bar.time || !bar.open || !bar.high || !bar.low || !bar.close) {
        throw new Error("invalid OHLCV bar shape");
      }
    }],
    ["GET /api/market/sodex/orderbook/vBTC_vUSDC", async () => {
      const res = await fetch(`${API_URL}/api/market/sodex/orderbook/vBTC_vUSDC`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!data.data || !Array.isArray(data.data.bids) || !Array.isArray(data.data.asks)) {
        throw new Error("missing orderbook bids/asks");
      }
    }],
    ["GET /api/market/heatmap", async () => {
      const res = await fetch(`${API_URL}/api/market/heatmap`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data)) throw new Error("missing data array");
      if (!data.meta?.status) throw new Error("missing meta.status");
    }],
    ["GET /api/market/opportunities", async () => {
      const res = await fetch(`${API_URL}/api/market/opportunities?limit=3`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data)) throw new Error("missing data array");
      if (!data.meta?.status) throw new Error("missing meta.status");
    }],
    ["GET /api/ledger/stats", async () => {
      const res = await fetch(`${API_URL}/api/ledger/stats`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!data.data || typeof data.data.totalSignals !== "number") {
        throw new Error("missing ledger stats");
      }
    }],
    ["GET /api/strategies", async () => {
      const res = await fetch(`${API_URL}/api/strategies`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data)) throw new Error("missing data array");
      if (!data.meta?.status) throw new Error("missing meta.status");
      // Static seed strategies removed — empty before pipeline is OK
      for (const s of data.data) {
        if (s.tvl > 0 && s.id?.startsWith("ssi-mag7-003")) {
          throw new Error("static seed strategy catalog detected");
        }
      }
    }],
    ["POST /api/sentinel/check", async () => {
      const res = await fetch(`${API_URL}/api/sentinel/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: "pipeline-preview",
          newsletterId: "nl-test",
          userAddress: "0x0000000000000000000000000000000000000001",
          allocationUSD: 100,
          maxSlippageBps: 50,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!data.data?.checks || data.data.checks.length < 8) throw new Error("expected at least 8 sentinel checks");
    }],
    ["POST /api/broker/execute rejects unsigned intents", async () => {
      const res = await fetch(`${API_URL}/api/broker/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: "pipeline-preview",
          newsletterId: "nl-test",
          userAddress: "0x0000000000000000000000000000000000000001",
          allocationUSD: 100,
          maxSlippageBps: 50,
        }),
      });
      if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
    }],
    ["GET /api/copy-trade/performance", async () => {
      const res = await fetch(`${API_URL}/api/copy-trade/performance`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (typeof data.data.totalTrades !== "number") throw new Error("missing totalTrades");
      if ("estimatedPnl" in data.data) throw new Error("fabricated estimatedPnl field still present");
      if ("winRate" in data.data && data.data.totalTrades === 0 && data.data.winRate !== null) {
        // winRate null when no trades is OK
      }
    }],
    ["GET /api/agents/chartanalyst/status", async () => {
      const res = await fetch(`${API_URL}/api/agents/chartanalyst/status`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const status = data.data?.status;
      if (!status) throw new Error("missing agent status");
      if (status === "error") {
        throw new Error(`chart analyst in error state: ${data.data?.lastError ?? "unknown"}`);
      }
    }],
    ["GET /api/agents", async () => {
      const res = await fetch(`${API_URL}/api/agents`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data) || data.data.length < 5) throw new Error("expected 5 agents");
      const broker = data.data.find((a) => a.name === "broker");
      if (broker?.message?.includes("Demo mode")) {
        throw new Error("broker still shows demo mode message");
      }
    }],
  ];

  if (RUN_PIPELINE) {
    tests.push(["POST /api/agents/pipeline/trigger", async () => {
      const res = await fetch(`${API_URL}/api/agents/pipeline/trigger`, {
        method: "POST",
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data) || data.data.length < 5) throw new Error("expected agent states");
      if (!data.pipeline?.strategy?.id) throw new Error("pipeline did not generate a strategy");
      if (!data.pipeline?.sentinelDryRun?.checks?.length) {
        throw new Error("pipeline missing sentinel dry-run");
      }
      const strategist = data.data.find((a) => a.name === "strategist");
      if (strategist?.status === "error") {
        throw new Error(`strategist failed: ${strategist.message}`);
      }
    }]);
  }

  for (const [name, fn] of tests) {
    total++;
    if (await check(name, fn)) passed++;
  }

  console.log(`\n${passed}/${total} passed`);
  process.exit(passed === total ? 0 : 1);
}

main();
