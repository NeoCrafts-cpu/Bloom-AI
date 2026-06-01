import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Signal ledger status transitions", () => {
  let prevDataDir: string | undefined;
  let tempDir: string;

  before(() => {
    prevDataDir = process.env.BLOOM_DATA_DIR;
    tempDir = mkdtempSync(join(tmpdir(), "bloom-ledger-"));
    process.env.BLOOM_DATA_DIR = tempDir;
  });

  after(() => {
    if (prevDataDir === undefined) delete process.env.BLOOM_DATA_DIR;
    else process.env.BLOOM_DATA_DIR = prevDataDir;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("records signal as open and transitions to blocked", async () => {
    const { signalLedger } = await import("../src/store/signalLedger.js");

    const signal = signalLedger.recordSignal({
      source: "discovery",
      title: "Test Opportunity",
      summary: "Unit test signal",
      keyAssets: ["BTC"],
      evidence: [{ source: "test", label: "Score", value: 42, module: "computed" }],
      inputData: { symbol: "BTC" },
      contentData: { thesis: "test" },
      score: 42,
    });

    assert.equal(signal.status, "open");
    assert.ok(signal.inputDigest.length > 8);
    assert.ok(signal.contentDigest.length > 8);

    signalLedger.updateStatus(signal.id, "blocked");
    const fetched = signalLedger.getSignalById(signal.id);
    assert.equal(fetched?.status, "blocked");

    const stats = signalLedger.getStats();
    assert.ok(stats.totalSignals >= 1);
    assert.ok(stats.blockedSignals >= 1);
  });
});
