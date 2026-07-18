import { v4 as uuid } from "uuid";
import type { CopyTradeIntent, CopyTradeResult, OrderFill, SSIIndex } from "@bloom-ai/types";
import {
  placeBatchSpotOrders,
  placeBatchPerpsOrders,
  placeTwapOrder,
  getAccountState,
  getPerpsAccountState,
  getSymbolIdMap,
  getSymbols,
  getOrderHistory,
  updatePerpsLeverage,
  isSymbolCancelOnly,
  markSymbolCancelOnly,
  isCancelOnlyError,
} from "../../services/sodex.js";
import { formatDecimalString } from "../../signing/eip712.js";
import { getMarketSnapshots } from "../../services/sosovalue.js";
import { strategyStore } from "../strategist/index.js";
import { wsManager } from "../../ws/manager.js";
import { config } from "../../config.js";
import { signalLedger } from "../../store/signalLedger.js";

export let brokerStatus: {
  status: "running" | "idle" | "error";
  lastRun: string | null;
  lastError: string | null;
  lastMessage: string;
  cycleCount: number;
} = {
  status: "idle",
  lastRun: null,
  lastError: null,
  lastMessage: "Awaiting user confirmation in Copy Trade",
  cycleCount: 0,
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
  brokerStatus.status = "running";
  brokerStatus.lastError = null;
  const intentId = uuid();

  try {
  const usePerps = intent.venue === "perps";
  if (usePerps && !config.SODEX_ENABLE_PERPS_COPY) {
    throw new Error("Perps copy-trade disabled — set SODEX_ENABLE_PERPS_COPY=1");
  }
  if (config.SODEX_NETWORK === "mainnet" && !intent.userSignature) {
    throw new Error("Mainnet execution requires explicit user signature");
  }

  // Live orders are always EIP-712 signed by SODEX_API_PRIVATE_KEY.
  // accountID MUST belong to that signing wallet — using another MetaMask wallet's
  // accountID causes SoDEX "API key not found" (signature owner ≠ account owner).
  const { getSigningAddress } = await import("../../services/sodex.js");
  const signingAddr = getSigningAddress();
  const live = !!config.SODEX_API_PRIVATE_KEY && !!signingAddr;

  const candidateAddrs = (
    live
      ? [config.SODEX_API_KEY_ADDRESS, signingAddr]
      : [intent.userAddress, config.SODEX_API_KEY_ADDRESS, signingAddr]
  )
    .map((a) => a?.trim())
    .filter((a): a is string => !!a && /^0x[0-9a-fA-F]{40}$/.test(a));

  let accountID = 0;
  let resolvedAddr = "";
  for (const addr of [...new Set(candidateAddrs.map((a) => a.toLowerCase()))]) {
    const accountState = usePerps
      ? await getPerpsAccountState(addr)
      : await getAccountState(addr);
    if (accountState && accountState.accountID > 0) {
      accountID = accountState.accountID;
      resolvedAddr = addr;
      console.log(`[Broker] Resolved accountID=${accountID} for ${addr}`);
      break;
    }
  }

  if (!(accountID > 0)) {
    throw new Error(
      live
        ? `SoDEX accountID not found for signing wallet ${signingAddr}. ` +
          `Fund that testnet account (or set SODEX_API_KEY_ADDRESS), then retry.`
        : `SoDEX accountID not found for ${intent.userAddress || "wallet"}. ` +
          `Connect a funded SoDEX testnet wallet (or configure SODEX_API_PRIVATE_KEY), then retry.`,
    );
  }
  if (
    intent.userAddress &&
    resolvedAddr &&
    intent.userAddress.toLowerCase() !== resolvedAddr.toLowerCase()
  ) {
    console.warn(
      `[Broker] MetaMask ${intent.userAddress} ≠ execution wallet ${resolvedAddr} (#${accountID}) — ` +
        `fills use the API-key account (MetaMask only authorizes the intent).`,
    );
  }

  // ── Resolve real symbolIDs from SoDEX market symbols ─────────────────────
  const [symbolIdMap, symbols] = await Promise.all([getSymbolIdMap(), getSymbols()]);
  console.log(`[Broker] Resolved symbolIDs:`, symbolIdMap);
  const symbolMeta = Object.fromEntries(symbols.map((s) => [s.symbolID, s]));

  // ── Get live prices from SoDEX ────────────────────────────────────────────
  const marketResult = await getMarketSnapshots().catch(() => null);
  const priceMap: Record<string, number> = {};
  if (marketResult?.data) {
    for (const m of marketResult.data) {
      priceMap[m.symbol] = m.price;
    }
  }

  // ── Resolve SSI index from pipeline-generated store ───────────────────────
  const stored = strategyStore.getById(intent.strategyId);
  if (!stored) {
    brokerStatus.status = "error";
    brokerStatus.lastError = `Strategy ${intent.strategyId} not found — run pipeline first`;
    throw new Error(brokerStatus.lastError);
  }
  const index: SSIIndex = {
    ...stored,
    assets: stored.assets.map((a) => ({
      ...a,
      currentPrice: priceMap[a.symbol] ?? a.currentPrice,
    })),
  };

  // ── Place batch orders per asset ──────────────────────────────────────────
  const fills: OrderFill[] = [];
  const skipped: string[] = [];
  const useTwap = intent.executionStyle === "twap";
  const twapDurationSec = intent.twapDurationSec ?? 300;

  if (useTwap && !config.SODEX_ENABLE_TWAP) {
    throw new Error("TWAP disabled — set SODEX_ENABLE_TWAP=1");
  }

  // Pre-filter: skip unknown / cancel-only markets, then renormalize weights so
  // the full allocation still hits tradable legs (ETH is often cancel-only on testnet
  // even when /markets/symbols still reports TRADING).
  type Leg = { asset: (typeof index.assets)[number]; symbolID: number };
  const legs: Leg[] = [];
  for (const asset of index.assets) {
    const symbolID = symbolIdMap[asset.symbol.toUpperCase()] ?? symbolIdMap[asset.symbol];
    if (!symbolID) {
      skipped.push(`${asset.symbol}:no-symbolID`);
      continue;
    }
    const metaStatus = symbolMeta[symbolID]?.status?.toUpperCase();
    if (metaStatus && metaStatus !== "TRADING" && metaStatus !== "ONLINE") {
      skipped.push(`${asset.symbol}:status-${metaStatus}`);
      markSymbolCancelOnly(symbolID);
      continue;
    }
    if (isSymbolCancelOnly(symbolID)) {
      skipped.push(`${asset.symbol}:cancel-only`);
      continue;
    }
    legs.push({ asset, symbolID });
  }

  const weightSum = legs.reduce((s, l) => s + l.asset.weight, 0);
  if (!(weightSum > 0)) {
    throw new Error(
      `No tradable SoDEX markets for this strategy.` +
        (skipped.length ? ` Skipped: ${skipped.join(", ")}` : "") +
        ` (cancel-only / missing pairs are common on testnet — try BTC/SOL-heavy baskets)`,
    );
  }

  for (const { asset, symbolID } of legs) {
    const price = asset.currentPrice || priceMap[asset.symbol] || 0;
    const assetAllocation = intent.allocationUSD * (asset.weight / weightSum);

    const clOrdID = `bloom-${intentId.slice(0, 6)}-${asset.symbol}-${Date.now()}`.slice(0, 36);
    const meta = symbolMeta[symbolID];
    const fundsPrecision = 6; // vUSDC quoteCoinPrecision
    const qtyPrecision = Number(meta?.quantityPrecision ?? 5);
    const stepSize = parseFloat(meta?.stepSize ?? "0.00001") || 0.00001;
    const minNotional = parseFloat(meta?.minNotional ?? "5") || 5;

    if (assetAllocation + 1e-12 < minNotional) {
      skipped.push(`${asset.symbol}:below-minNotional(${minNotional})`);
      console.warn(`[Broker] ${asset.symbol} allocation $${assetAllocation} < minNotional $${minNotional}`);
      continue;
    }

    const fundsDecimal = formatDecimalString(assetAllocation, fundsPrecision);
    const rawQty = price > 0 ? assetAllocation / price : 0;
    const steppedQty = Math.floor(rawQty / stepSize + 1e-12) * stepSize;
    const quantityDecimal = formatDecimalString(steppedQty, qtyPrecision);

    wsManager.broadcast({
      type: "ORDER_SUBMITTED",
      payload: {
        intentId,
        symbol: `${asset.symbol}/USDC`,
        weight: asset.weight,
        allocationUSD: assetAllocation,
        executionStyle: useTwap ? "twap" : "market",
        twapDurationSec: useTwap ? twapDurationSec : undefined,
      },
      timestamp: new Date().toISOString(),
    });

    try {
      if (useTwap) {
        const qty = parseFloat(quantityDecimal);
        if (!(qty > 0)) {
          console.warn(`[Broker] TWAP skip ${asset.symbol} — zero quantity (need live price)`);
          skipped.push(`${asset.symbol}:zero-qty`);
          continue;
        }
        if (usePerps) {
          const lev = Math.min(intent.leverage ?? 1, config.SENTINEL_MAX_LEVERAGE);
          await updatePerpsLeverage(accountID, symbolID, lev).catch(() => null);
        }
        const twapResult = (await placeTwapOrder(accountID, symbolID, {
          clOrdID,
          side: 1,
          quantity: quantityDecimal,
          durationSec: twapDurationSec,
          isPerps: usePerps,
        })) as { clOrdID?: string; status?: string; orderId?: string | number };

        const fill: OrderFill = {
          orderId: String(twapResult.orderId ?? `${clOrdID}-twap`),
          clOrdID,
          symbol: `${asset.symbol}/USDC`,
          side: 1,
          fillPrice: price,
          fillQuantity: qty,
          status: "new",
          timestamp: new Date().toISOString(),
        };
        fills.push(fill);
        wsManager.broadcast({
          type: "ORDER_FILL",
          payload: {
            ...fill,
            simulated: false,
            venue: usePerps ? "perps" : "spot",
            executionStyle: "twap",
            twapDurationSec,
            status: twapResult.status ?? "SUBMITTED",
          },
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      let rawFills: { clOrdID: string; status: string; message?: string }[];
      if (usePerps) {
        const lev = Math.min(intent.leverage ?? 1, config.SENTINEL_MAX_LEVERAGE);
        await updatePerpsLeverage(accountID, symbolID, lev).catch(() => null);
        rawFills = (await placeBatchPerpsOrders(accountID, symbolID, [
          {
            clOrdID,
            modifier: 1,
            side: 1,
            type: 2,
            timeInForce: 3,
            quantity: quantityDecimal,
            reduceOnly: false,
            positionSide: 1,
          },
        ])) as { clOrdID: string; status: string; message?: string }[];
      } else {
        rawFills = await placeBatchSpotOrders(accountID, symbolID, [
          {
            symbolID,
            clOrdID,
            side: 1 as const,
            type: 2 as const,
            timeInForce: 3 as const, // IOC — required for market orders
            funds: fundsDecimal,
          },
        ]);
      }

      for (const raw of rawFills) {
        const row = raw as { clOrdID: string; status?: string; message?: string; code?: number; orderID?: number };
        if (typeof row.code === "number" && row.code !== 0) {
          throw new Error(`SoDEX rejected ${asset.symbol}: code ${row.code} (${row.message ?? row.clOrdID})`);
        }
        const isSimulated = row.message?.includes("Simulated") || row.message?.includes("configure");
        const accepted =
          row.status === "FILLED" ||
          row.status === "NEW" ||
          row.status === "filled" ||
          (typeof row.code === "number" && row.code === 0) ||
          !!row.orderID;
        const fill: OrderFill = {
          orderId: row.orderID ? String(row.orderID) : `${row.clOrdID}-fill`,
          clOrdID: row.clOrdID,
          symbol: `${asset.symbol}/USDC`,
          side: 1,
          fillPrice: price,
          fillQuantity: price > 0 ? assetAllocation / price : 0,
          status: accepted ? "filled" : "new",
          timestamp: new Date().toISOString(),
        };
        fills.push(fill);
        wsManager.broadcast({
          type: "ORDER_FILL",
          payload: { ...fill, simulated: isSimulated, venue: usePerps ? "perps" : "spot" },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      console.error(`[Broker] Order failed for ${asset.symbol}:`, err);
      // Cancel-only is a market-state reject — skip leg and keep basket alive
      if (isCancelOnlyError(msg)) {
        markSymbolCancelOnly(symbolID);
        skipped.push(`${asset.symbol}:cancel-only`);
        console.warn(`[Broker] ${asset.symbol} cancel-only — skipping remaining allocation for this leg`);
        continue;
      }
      // Propagate other errors — do NOT silently produce fake fills
      throw new Error(`Order execution failed for ${asset.symbol}: ${msg}`);
    }
  }

  if (fills.length === 0) {
    const detail = skipped.length ? ` skipped=[${skipped.join(", ")}]` : "";
    const known = Object.keys(symbolIdMap).slice(0, 12).join(",");
    throw new Error(
      `No SoDEX orders placed for strategy ${intent.strategyId}.${detail} Known bases: ${known || "none"}`,
    );
  }

  if (skipped.length) {
    console.warn(`[Broker] Partial basket — skipped: ${skipped.join(", ")}`);
  }

  // ── Wait briefly for fills to settle then fetch order history ─────────────
  if (resolvedAddr && accountID > 0) {
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const history = await getOrderHistory(resolvedAddr, undefined, 5);
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

  brokerStatus.status = "idle";
  brokerStatus.lastRun = new Date().toISOString();
  brokerStatus.lastMessage = skipped.length
    ? `Executed ${fills.length} orders for $${totalExecuted.toFixed(2)} — skipped ${skipped.length} (e.g. cancel-only) — Account #${accountID}`
    : `Executed ${fills.length} orders for $${totalExecuted.toFixed(2)} — Account #${accountID}`;
  brokerStatus.cycleCount++;

  if (intent.signalId) {
    signalLedger.recordExecution({
      signalId: intent.signalId,
      tradeId: intentId,
      strategyId: intent.strategyId,
      userAddress: intent.userAddress,
      allocationUSD: intent.allocationUSD,
      newsletterId: intent.newsletterId,
      simulated: !config.SODEX_API_PRIVATE_KEY,
      userSignature: intent.userSignature,
      totalExecutedUSD: totalExecuted,
    });
  }

  wsManager.broadcast({
    type: "AGENT_STATUS",
    payload: {
      name: "broker",
      status: "idle",
      message: brokerStatus.lastMessage,
    },
    timestamp: new Date().toISOString(),
  });

  return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    brokerStatus.status = "error";
    brokerStatus.lastError = msg;
    throw err;
  }
}
