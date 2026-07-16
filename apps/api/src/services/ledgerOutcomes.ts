/**
 * Resolve open/executed ledger signals against trade history + live marks.
 */
import { signalLedger } from "../store/signalLedger.js";
import { tradeStore } from "../store/tradeStore.js";
import { getMarketSnapshots } from "./sosovalue.js";

export async function resolveLedgerOutcomes(): Promise<{ resolved: number }> {
  const outcomes = signalLedger.getOutcomes(200);
  const trades = tradeStore.getHistory(200);
  const markets = await getMarketSnapshots().catch(() => null);
  const priceMap = Object.fromEntries((markets?.data ?? []).map((m) => [m.symbol, m.price]));

  let resolved = 0;

  for (const outcome of outcomes) {
    if (outcome.pnlUSD !== undefined || outcome.resolvedAt) continue;
    const trade = trades.find((t) => t.id === outcome.tradeId || t.signalId === outcome.signalId);
    if (!trade) continue;

    const rawSymbol =
      trade.symbol === "MULTI"
        ? trade.orders[0]?.symbol?.replace(/^v/, "").split("_")[0]
        : trade.symbol;
    const symbol = rawSymbol?.toUpperCase();
    const mark = symbol ? priceMap[symbol] : undefined;
    const fillPx = trade.orders[0]
      ? parseFloat(String((trade.orders[0] as { price?: string }).price ?? "0"))
      : 0;

    let pnl = trade.pnlUSD;
    if (pnl === undefined && mark && fillPx > 0 && trade.totalExecutedUSD > 0) {
      const qty = trade.totalExecutedUSD / fillPx;
      pnl = (mark - fillPx) * qty;
      trade.pnlUSD = parseFloat(pnl.toFixed(2));
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
