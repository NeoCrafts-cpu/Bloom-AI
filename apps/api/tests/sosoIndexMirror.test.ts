import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { constituentsToSsiAssets } from "../src/services/sosovalue.js";

describe("SoSo index constituents → SSI", () => {
  it("normalizes weights to sum 1", () => {
    const assets = constituentsToSsiAssets([
      { symbol: "btc", weight: 0.31 },
      { symbol: "eth", weight: 0.19 },
      { symbol: "sol", weight: 0.5 },
    ]);
    assert.equal(assets.length, 3);
    assert.equal(assets[0].symbol, "BTC");
    const sum = assets.reduce((s, a) => s + a.weight, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9);
  });

  it("returns empty when no positive weights", () => {
    assert.deepEqual(constituentsToSsiAssets([{ symbol: "btc", weight: 0 }]), []);
  });
});
