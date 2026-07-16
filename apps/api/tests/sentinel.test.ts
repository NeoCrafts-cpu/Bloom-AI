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

  it("passes valid intent", () => {
    const report = runSentinel(baseIntent);
    assert.equal(report.passed, true);
    assert.ok(report.checks.length >= 8);
  });

  it("blocks oversized order", () => {
    const report = runSentinel({ ...baseIntent, allocationUSD: 999999 });
    assert.equal(report.passed, false);
    assert.ok(report.checks.some((c) => c.rule === "MAX_ORDER_USD" && !c.passed));
  });

  it("blocks invalid address", () => {
    const report = runSentinel({ ...baseIntent, userAddress: "not-an-address" });
    assert.equal(report.passed, false);
    assert.ok(report.checks.some((c) => c.rule === "VALID_USER_ADDRESS" && !c.passed));
  });

  it("blocks zero allocation", () => {
    const report = runSentinel({ ...baseIntent, allocationUSD: 0 });
    assert.equal(report.passed, false);
  });
});
