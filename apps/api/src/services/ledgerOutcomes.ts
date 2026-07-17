/**
 * Resolve open/executed ledger signals against trade history + live marks.
 */
import { signalLedger } from "../store/signalLedger.js";
import { tradeStore } from "../store/tradeStore.js";
import { getMarketSnapshots } from "./sosovalue.js";
import { getPerpsMarkPrices } from "./sodex.js";
import { getAllMarkPrices, setMarkPrices } from "./markPriceCache.js";

export async function resolveLedgerOutcomes(): Promise<{ resolved: number }> {
  const outcomes = signalLedger.getOutcomes(200);
  const trades = tradeStore.getHistory(200);

  let marks = getAllMarkPrices();
  if (Object.keys(marks).length === 0) {
    const [spot, perps] = await Promise.all([
      getMarketSnapshots().catch(() => null),
      getPerpsMarkPrices().catch(() => []),
    ]);
    const entries: { symbol: string; price: number }[] = [];
    for (const m of spot?.data ?? []) {
      if (m.price > 0) entries.push({ symbol: m.symbol, price: m.price });
    }
    for (const m of perps) {
      const px = parseFloat(m.markPrice);
      if (px > 0) entries.push({ symbol: m.symbol, price: px });
    }
    setMarkPrices(entries);
    marks = getAllMarkPrices();
  }

  tradeStore.updatePnlFromMarks(marks);

  let resolved = 0;

  for (const outcome of outcomes) {
    if (outcome.pnlUSD !== undefined || outcome.resolvedAt) continue;
    const trade = trades.find((t) => t.id === outcome.tradeId || t.signalId === outcome.signalId);
    if (!trade) continue;

    let pnl = trade.pnlUSD;
    if (pnl === undefined && trade.orders?.length) {
      let sum = 0;
      let priced = 0;
      for (const o of trade.orders) {
        const base = o.symbol.replace(/^v/, "").split(/[_/-]/)[0].toUpperCase();
        const mark = marks[base];
        if (!mark || !(o.fillPrice > 0) || !(o.fillQuantity > 0)) continue;
        const sideMul = o.side === 1 ? 1 : -1;
        sum += sideMul * (mark - o.fillPrice) * o.fillQuantity;
        priced++;
      }
      if (priced > 0) {
        pnl = parseFloat(sum.toFixed(2));
        trade.pnlUSD = pnl;
      }
    }

    if (pnl === undefined) continue;

    const pnlBps = outcome.entryNotionalUSD > 0
      ? Math.round((pnl / outcome.entryNotionalUSD) * 10_000)
      : 0;

    signalLedger.resolveOutcome(outcome.signalId, {
      pnlUSD: parseFloat(pnl.toFixed(2)),
      pnlBps,
      exitNotionalUSD: parseFloat((outcome.entryNotionalUSD + pnl).toFixed(2)),
      resolvedAt: new Date().toISOString(),
    });
    resolved++;
  }

  return { resolved };
}
