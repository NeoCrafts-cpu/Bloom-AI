#!/usr/bin/env node
/**
 * Bloom AI smoke test — verifies core API endpoints.
 * Usage: API_URL=http://localhost:4000 node scripts/smoke-test.mjs
 */

const API_URL = process.env.API_URL ?? "http://localhost:4000";

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
      // Seed fallback uses a fixed demo BTC price (~97420)
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
    ["GET /api/strategies", async () => {
      const res = await fetch(`${API_URL}/api/strategies`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data) || data.data.length === 0) throw new Error("no strategies");
    }],
    ["POST /api/sentinel/check", async () => {
      const res = await fetch(`${API_URL}/api/sentinel/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: "ssi-mag7-003",
          newsletterId: "nl-test",
          userAddress: "0x0000000000000000000000000000000000000001",
          allocationUSD: 100,
          maxSlippageBps: 50,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!data.data?.checks || data.data.checks.length < 8) throw new Error("expected 8 sentinel checks");
    }],
    ["GET /api/copy-trade/performance", async () => {
      const res = await fetch(`${API_URL}/api/copy-trade/performance`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (typeof data.data.totalTrades !== "number") throw new Error("missing totalTrades");
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
      const fakeRunning = data.data.filter(
        (a) => (a.name === "sentinel" || a.name === "strategist") && a.status === "running",
      );
      if (fakeRunning.length > 0) throw new Error("agents should not show fake running states");
    }],
  ];

  for (const [name, fn] of tests) {
    total++;
    if (await check(name, fn)) passed++;
  }

  console.log(`\n${passed}/${total} passed`);
  process.exit(passed === total ? 0 : 1);
}

main();
