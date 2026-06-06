import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { marketEnvelope, resolveMarketStatus, unavailableEnvelope } from "../src/lib/marketMeta.js";

describe("marketMeta", () => {
  it("resolveMarketStatus returns unavailable for empty cold cache", () => {
    assert.equal(resolveMarketStatus([], false, null), "unavailable");
  });

  it("resolveMarketStatus returns empty for empty warm cache", () => {
    assert.equal(resolveMarketStatus([], false, Date.now()), "empty");
  });

  it("marketEnvelope always includes meta.status", () => {
    const res = marketEnvelope([{ symbol: "BTC" }], { cachedAt: Date.now(), isStale: false });
    assert.equal(res.meta.status, "live");
    assert.ok(Array.isArray(res.data));
  });

  it("unavailableEnvelope marks status unavailable", () => {
    const res = unavailableEnvelope([], "offline");
    assert.equal(res.meta.status, "unavailable");
    assert.equal(res.meta.message, "offline");
  });
});
