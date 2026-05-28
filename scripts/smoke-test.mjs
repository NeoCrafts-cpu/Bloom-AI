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
    ["GET /api/agents", async () => {
      const res = await fetch(`${API_URL}/api/agents`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data) || data.data.length < 5) throw new Error("expected 5 agents");
    }],
    ["GET /api/ledger/signals", async () => {
      const res = await fetch(`${API_URL}/api/ledger/signals?limit=5`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data)) throw new Error("expected signals array");
    }],
    ["GET /api/ledger/stats", async () => {
      const res = await fetch(`${API_URL}/api/ledger/stats`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (typeof data.data.totalSignals !== "number") throw new Error("missing totalSignals");
    }],
    ["GET /api/market/opportunities", async () => {
      const res = await fetch(`${API_URL}/api/market/opportunities?limit=3`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data)) throw new Error("expected opportunities array");
    }],
    ["GET /api/strategies/:id/history", async () => {
      const res = await fetch(`${API_URL}/api/strategies/ssi-mag7-003/history`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.data)) throw new Error("expected history array");
    }],
    ["POST /api/strategies/compare", async () => {
      const res = await fetch(`${API_URL}/api/strategies/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idA: "ssi-mag7-003", idB: "ssi-defi-002", notionalUSD: 10000 }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!data.data?.weightDiffs) throw new Error("missing weightDiffs");
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
