import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseSodexKlines,
  parseSodexTickerChangePct,
  parseSodexTickerPrice,
  parseSodexTickerVolume,
  normalizeSodexSymbols,
  normalizeSodexAccountState,
} from "../src/lib/sodexParse.js";

describe("sodexParse", () => {
  it("parses current ticker field names", () => {
    assert.equal(parseSodexTickerPrice({ symbol: "vBTC_vUSDC", lastPx: "63452.1" }), 63452.1);
    assert.equal(parseSodexTickerChangePct({ symbol: "vBTC_vUSDC", changePct: -1.25 }), -1.25);
    assert.equal(parseSodexTickerVolume({ symbol: "vBTC_vUSDC", q: "1200000" }), 1200000);
  });

  it("parses legacy ticker field names", () => {
    assert.equal(parseSodexTickerPrice({ symbol: "vBTC_vUSDC", lastPrice: "50000" }), 50000);
    assert.equal(parseSodexTickerChangePct({ symbol: "vBTC_vUSDC", priceChangePercent: "2.5" }), 2.5);
    assert.equal(parseSodexTickerVolume({ symbol: "vBTC_vUSDC", quoteVolume: "900000" }), 900000);
  });

  it("parses object klines and normalizes seconds to ms", () => {
    const bars = parseSodexKlines([
      { t: 1717843200, o: 100, h: 110, l: 95, c: 105, v: 1000 },
    ]);
    assert.equal(bars.length, 1);
    assert.equal(bars[0].time, 1717843200000);
    assert.equal(bars[0].close, 105);
  });

  it("parses tuple klines", () => {
    const bars = parseSodexKlines([
      [1717843200000, "100", "110", "95", "105", "1000"],
    ]);
    assert.equal(bars.length, 1);
    assert.equal(bars[0].open, 100);
    assert.equal(bars[0].volume, 1000);
  });

  it("returns empty array for unparseable klines", () => {
    assert.deepEqual(parseSodexKlines([{ t: 0, o: 0, h: 0, l: 0, c: 0, v: 0 }]), []);
  });

  it("normalizes current SoDEX symbol schema (id/name/baseCoin)", () => {
    const symbols = normalizeSodexSymbols([
      { id: 1, name: "vBTC_vUSDC", baseCoin: "vBTC", quoteCoin: "vUSDC", minNotional: "5" },
      { id: 2, name: "vETH_vUSDC", baseCoin: "vETH", quoteCoin: "vUSDC" },
    ]);
    assert.equal(symbols.length, 2);
    assert.equal(symbols[0].symbolID, 1);
    assert.equal(symbols[0].baseAsset, "vBTC");
    assert.equal(symbols[0].symbol, "vBTC_vUSDC");
  });

  it("normalizes account state aid/B format", () => {
    const state = normalizeSodexAccountState({
      user: "0xabc",
      aid: 56647,
      B: [{ i: 0, a: "vUSDC", t: "500.5", l: "0" }],
      O: null,
    });
    assert.ok(state);
    assert.equal(state!.accountID, 56647);
    assert.equal(state!.balances[0].asset, "vUSDC");
    assert.equal(state!.balances[0].total, "500.5");
  });
});
