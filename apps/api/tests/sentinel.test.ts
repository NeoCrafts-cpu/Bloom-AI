import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runSentinel } from "../src/agents/sentinel/index.js";

describe("Sentinel", () => {
  const baseIntent = {
    strategyId: "ssi-mag7-003",
    newsletterId: "nl-test",
    userAddress: "0x0000000000000000000000000000000000000001",
    allocationUSD: 100,
    maxSlippageBps: 50,
  };

  it("passes valid intent", async () => {
    const report = await runSentinel(baseIntent);
    assert.equal(report.passed, true);
    assert.ok(report.checks.length >= 9);
    assert.ok(report.checks.some((c) => c.rule === "MACRO_EVENT_HARD_GATE"));
  });

  it("blocks oversized order", async () => {
    const report = await runSentinel({ ...baseIntent, allocationUSD: 999999 });
    assert.equal(report.passed, false);
    assert.ok(report.checks.some((c) => c.rule === "MAX_ORDER_USD" && !c.passed));
  });

  it("blocks invalid address", async () => {
    const report = await runSentinel({ ...baseIntent, userAddress: "not-an-address" });
    assert.equal(report.passed, false);
    assert.ok(report.checks.some((c) => c.rule === "VALID_USER_ADDRESS" && !c.passed));
  });

  it("blocks zero allocation", async () => {
    const report = await runSentinel({ ...baseIntent, allocationUSD: 0 });
    assert.equal(report.passed, false);
  });

  it("blocks TWAP when disabled or duration invalid", async () => {
    const report = await runSentinel({
      ...baseIntent,
      executionStyle: "twap",
      twapDurationSec: 10,
    });
    assert.equal(report.passed, false);
    assert.ok(report.checks.some((c) => c.rule === "TWAP_DURATION" && !c.passed));
  });
});
