import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateWeights } from "../src/store/strategy.js";

describe("validateWeights", () => {
  it("accepts weights summing to 1.0", () => {
    const result = validateWeights([
      { symbol: "BTC", address: "0x1", weight: 0.6, currentPrice: 0 },
      { symbol: "ETH", address: "0x2", weight: 0.4, currentPrice: 0 },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.sum, 1);
  });

  it("rejects weights not summing to 1.0", () => {
    const result = validateWeights([
      { symbol: "BTC", address: "0x1", weight: 0.5, currentPrice: 0 },
      { symbol: "ETH", address: "0x2", weight: 0.3, currentPrice: 0 },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes("1.0"));
  });

  it("allows small floating point tolerance", () => {
    const result = validateWeights([
      { symbol: "BTC", address: "0x1", weight: 0.333, currentPrice: 0 },
      { symbol: "ETH", address: "0x2", weight: 0.333, currentPrice: 0 },
      { symbol: "SOL", address: "0x3", weight: 0.334, currentPrice: 0 },
    ]);
    assert.equal(result.valid, true);
  });
});
