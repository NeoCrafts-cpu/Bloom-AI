import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeRSI, computeSMA, computeTAMetrics, taScore } from "../src/lib/ta.js";

describe("TA helpers", () => {
  it("computeSMA returns average of last N values", () => {
    assert.equal(computeSMA([1, 2, 3, 4, 5], 3), 4);
  });

  it("computeRSI returns bounded value", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const rsi = computeRSI(closes, 14);
    assert.ok(rsi >= 0 && rsi <= 100);
  });

  it("computeTAMetrics detects bullish trend on rising series", () => {
    const klines = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100 + i,
      volume: 1000 + i * 10,
    }));
    const metrics = computeTAMetrics(klines);
    assert.ok(metrics);
    assert.equal(metrics!.trend, "bullish");
    assert.ok(taScore(metrics) > 0);
  });

  it("taScore returns 0 for null metrics", () => {
    assert.equal(taScore(null), 0);
  });
});
