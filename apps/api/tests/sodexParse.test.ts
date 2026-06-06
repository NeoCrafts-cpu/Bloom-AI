import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseSodexKlines,
  parseSodexTickerChangePct,
  parseSodexTickerPrice,
  parseSodexTickerVolume,
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
});
