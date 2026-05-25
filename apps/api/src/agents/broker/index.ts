import { v4 as uuid } from "uuid";
import type { CopyTradeIntent, CopyTradeResult, OrderFill, SSIIndex } from "@bloom-ai/types";
import {
  placeBatchSpotOrders,
  getAccountState,
  getSymbolIdMap,
  getOrderHistory,
} from "../../services/sodex.js";
import { getMarketSnapshots } from "../../services/sosovalue.js";
import { wsManager } from "../../ws/manager.js";

// SSI strategy definitions — assets map to SoDEX vToken symbols
const STRATEGY_INDEX_MAP: Record<string, SSIIndex> = {
  "ssi-rwa-001": {
    id: "ssi-rwa-001",
    name: "BLOOM-RWA",
    symbol: "BLOOM-RWA.ssi",
    description: "Real World Asset index — BTC, ETH, LINK exposure on-chain",
    assets: [
      { symbol: "BTC",  address: "0x0000000000000000000000000000000000000001", weight: 0.40, currentPrice: 0 },
      { symbol: "ETH",  address: "0x0000000000000000000000000000000000000002", weight: 0.35, currentPrice: 0 },
      { symbol: "LINK", address: "0x0000000000000000000000000000000000000003", weight: 0.25, currentPrice: 0 },
    ],
    tvl: 0,
    dailyFee: 0.0001,
    createdAt: new Date().toISOString(),
    rebalancedAt: new Date().toISOString(),
  },
  "ssi-defi-002": {
    id: "ssi-defi-002",
    name: "BLOOM-DEFI",
    symbol: "BLOOM-DEFI.ssi",
    description: "DeFi protocol basket — ETH-heavy with BTC hedge",
    assets: [
      { symbol: "ETH", address: "0x0000000000000000000000000000000000000002", weight: 0.55, currentPrice: 0 },
      { symbol: "BTC", address: "0x0000000000000000000000000000000000000001", weight: 0.45, currentPrice: 0 },
    ],
    tvl: 0,
    dailyFee: 0.0001,
    createdAt: new Date().toISOString(),
    rebalancedAt: new Date().toISOString(),
  },
  "ssi-mag7-003": {
    id: "ssi-mag7-003",
    name: "BLOOM-MAG7",
    symbol: "BLOOM-MAG7.ssi",
    description: "Crypto Magnificent 7 — BTC, ETH, SOL diversified",
    assets: [
      { symbol: "BTC", address: "0x0000000000000000000000000000000000000001", weight: 0.35, currentPrice: 0 },
      { symbol: "ETH", address: "0x0000000000000000000000000000000000000002", weight: 0.25, currentPrice: 0 },
      { symbol: "SOL", address: "0x0000000000000000000000000000000000000003", weight: 0.40, currentPrice: 0 },
    ],
    tvl: 0,
    dailyFee: 0.0001,
    createdAt: new Date().toISOString(),
    rebalancedAt: new Date().toISOString(),
  },
};

/**
 * Broker Agent — executes copy-trade intents on SoDEX testnet.
 *
 * 1. Resolves real accountID from SoDEX account state
 * 2. Resolves real symbolIDs from SoDEX market symbols
 * 3. Enriches strategy assets with live prices from SoDEX/CoinGecko
 * 4. Places batch spot market orders for each asset
 * 5. Broadcasts order events via WebSocket
 */
export async function executeCopyTrade(intent: CopyTradeIntent): Promise<CopyTradeResult> {
  const intentId = uuid();

  // ── Resolve real accountID from SoDEX ─────────────────────────────────────
  let accountID = 0;
  if (intent.userAddress && intent.userAddress !== "0x0000000000000000000000000000000000000000") {
    const accountState = await getAccountState(intent.userAddress);
    if (accountState?.accountID) {
      accountID = accountState.accountID;
      console.log(`[Broker] Resolved accountID=${accountID} for ${intent.userAddress}`);
    } else {
      console.warn(`[Broker] Could not resolve accountID for ${intent.userAddress} — using 0`);
    }
  }

  // ── Resolve real symbolIDs from SoDEX market symbols ─────────────────────
  const symbolIdMap = await getSymbolIdMap();
  console.log(`[Broker] Resolved symbolIDs:`, symbolIdMap);

  // ── Get live prices from SoDEX ────────────────────────────────────────────
  const marketResult = await getMarketSnapshots().catch(() => null);
  const priceMap: Record<string, number> = {};
  if (marketResult?.data) {
    for (const m of marketResult.data) {
      priceMap[m.symbol] = m.price;
    }
  }

  // ── Resolve SSI index ─────────────────────────────────────────────────────
  const indexTemplate = STRATEGY_INDEX_MAP[intent.strategyId] ?? STRATEGY_INDEX_MAP["ssi-mag7-003"];
  const index: SSIIndex = {
    ...indexTemplate,
    assets: indexTemplate.assets.map((a) => ({
      ...a,
      currentPrice: priceMap[a.symbol] ?? a.currentPrice,
    })),
  };

  // ── Place batch orders per asset ──────────────────────────────────────────
  const fills: OrderFill[] = [];

  for (const asset of index.assets) {
    const symbolID = symbolIdMap[asset.symbol];
    const price = asset.currentPrice || priceMap[asset.symbol] || 0;
    const assetAllocation = intent.allocationUSD * asset.weight;

    if (!symbolID) {
      console.warn(`[Broker] No symbolID for ${asset.symbol} — skipping`);
      continue;
    }

    const clOrdID = `bloom-${intentId.slice(0, 6)}-${asset.symbol}-${Date.now()}`;
    const fundsDecimal = assetAllocation.toFixed(6);

    wsManager.broadcast({
      type: "ORDER_SUBMITTED",
      payload: { intentId, symbol: `${asset.symbol}/USDC`, weight: asset.weight, allocationUSD: assetAllocation },
      timestamp: new Date().toISOString(),
    });

    try {
      const rawFills = await placeBatchSpotOrders(accountID, symbolID, [
        {
          clOrdID,
          side: 1 as const,    // buy
          type: 2 as const,    // market
          timeInForce: 2 as const, // IOC
          funds: fundsDecimal,
        },
      ]);

      for (const raw of rawFills) {
        const isSimulated = raw.message?.includes("Simulated") || raw.message?.includes("configure");
        const fill: OrderFill = {
          orderId: `${raw.clOrdID}-fill`,
          clOrdID: raw.clOrdID,
          symbol: `${asset.symbol}/USDC`,
          side: 1,
          fillPrice: price,
          fillQuantity: price > 0 ? assetAllocation / price : 0,
          status: raw.status === "FILLED" ? "filled" : "new",
          timestamp: new Date().toISOString(),
        };
        fills.push(fill);
        wsManager.broadcast({
          type: "ORDER_FILL",
          payload: { ...fill, simulated: isSimulated },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`[Broker] Order failed for ${asset.symbol}:`, err);
      // Propagate error — do NOT silently produce fake fills
      throw new Error(`Order execution failed for ${asset.symbol}: ${(err as Error).message}`);
    }
  }

  // ── Wait briefly for fills to settle then fetch order history ─────────────
  if (intent.userAddress && accountID > 0) {
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const history = await getOrderHistory(intent.userAddress, undefined, 5);
      if (history.length > 0) {
        console.log(`[Broker] Confirmed ${history.length} recent orders in account history`);
      }
    } catch {
      // Non-critical
    }
  }

  const totalExecuted = fills.reduce((sum, f) => sum + f.fillPrice * f.fillQuantity, 0);

  const result: CopyTradeResult = {
    intentId,
    sentinelStatus: "passed",
    orders: fills,
    totalExecutedUSD: totalExecuted,
    timestamp: new Date().toISOString(),
  };

  wsManager.broadcast({
    type: "AGENT_STATUS",
    payload: {
      name: "broker",
      status: "idle",
      message: `Executed ${fills.length} orders for $${totalExecuted.toFixed(2)} — Account #${accountID}`,
    },
    timestamp: new Date().toISOString(),
  });

  return result;
}
