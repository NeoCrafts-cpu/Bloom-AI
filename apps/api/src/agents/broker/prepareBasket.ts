import { v4 as uuid } from "uuid";
import type { CopyTradeIntent, SSIIndex } from "@bloom-ai/types";
import { config } from "../../config.js";
import { strategyStore } from "../strategist/index.js";
import {
  getAccountState,
  getSymbolIdMap,
  getSymbols,
  isSymbolCancelOnly,
  markSymbolCancelOnly,
} from "../../services/sodex.js";
import { getMarketSnapshots } from "../../services/sosovalue.js";
import { formatDecimalString, serializeSpotOrder, hashExchangePayload } from "../../signing/eip712.js";
import { getNonce } from "../../signing/nonceManager.js";
import { prepareStore, type PrepareSession } from "../../store/prepareStore.js";

/**
 * Build a spot batchNewOrder for the user's own SoDEX account (MetaMask wallet).
 * Returns EIP-712 typed data for the user to sign — no server private key involved.
 */
export async function prepareUserSpotBasket(intent: CopyTradeIntent): Promise<{
  session: PrepareSession;
  typedData: {
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract: `0x${string}`;
    };
    types: { ExchangeAction: { name: string; type: string }[] };
    primaryType: "ExchangeAction";
    message: { payloadHash: string; nonce: number };
  };
}> {
  if (intent.venue === "perps") {
    throw new Error("Per-wallet signing currently supports spot only — switch Venue to Spot");
  }
  if (intent.executionStyle === "twap") {
    throw new Error("Per-wallet signing currently supports MARKET only — switch Execution to MARKET");
  }
  if (!intent.userAddress || !/^0x[0-9a-fA-F]{40}$/.test(intent.userAddress)) {
    throw new Error("Connect a valid MetaMask wallet to prepare the trade");
  }

  const accountState = await getAccountState(intent.userAddress);
  if (!accountState || !(accountState.accountID > 0)) {
    throw new Error(
      `No SoDEX account for ${intent.userAddress}. Open SoDEX testnet, claim/deposit USDC, then retry.`,
    );
  }

  const stored = strategyStore.getById(intent.strategyId);
  if (!stored) {
    throw new Error(`Strategy ${intent.strategyId} not found — run the pipeline first`);
  }

  const marketResult = await getMarketSnapshots().catch(() => null);
  const priceMap: Record<string, number> = {};
  if (marketResult?.data) {
    for (const m of marketResult.data) priceMap[m.symbol] = m.price;
  }

  const index: SSIIndex = {
    ...stored,
    assets: stored.assets.map((a) => ({
      ...a,
      currentPrice: priceMap[a.symbol] ?? a.currentPrice,
    })),
  };

  const [symbolIdMap, symbols] = await Promise.all([getSymbolIdMap(), getSymbols()]);
  const symbolMeta = Object.fromEntries(symbols.map((s) => [s.symbolID, s]));

  type Leg = { asset: (typeof index.assets)[number]; symbolID: number };
  const legs: Leg[] = [];
  const skipped: string[] = [];

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
        (skipped.length ? ` Skipped: ${skipped.join(", ")}` : ""),
    );
  }

  const intentId = uuid();
  const preview: PrepareSession["preview"] = [];
  const orders: Record<string, unknown>[] = [];

  for (const { asset, symbolID } of legs) {
    const price = asset.currentPrice || priceMap[asset.symbol] || 0;
    const assetAllocation = intent.allocationUSD * (asset.weight / weightSum);
    const meta = symbolMeta[symbolID];
    const minNotional = parseFloat(meta?.minNotional ?? "5") || 5;
    if (assetAllocation + 1e-12 < minNotional) {
      skipped.push(`${asset.symbol}:below-minNotional(${minNotional})`);
      continue;
    }

    const clOrdID = `bloom-${intentId.slice(0, 6)}-${asset.symbol}-${Date.now()}`.slice(0, 36);
    const fundsDecimal = formatDecimalString(assetAllocation, 6);
    orders.push(
      serializeSpotOrder({
        symbolID,
        clOrdID,
        side: 1,
        type: 2,
        timeInForce: 3,
        funds: fundsDecimal,
      }),
    );
    preview.push({
      symbol: `${asset.symbol}/USDC`,
      funds: fundsDecimal,
      clOrdID,
      price,
      allocationUSD: assetAllocation,
    });
  }

  if (orders.length === 0) {
    throw new Error(
      `No orders to sign.` + (skipped.length ? ` Skipped: ${skipped.join(", ")}` : ""),
    );
  }

  const accountID = accountState.accountID;
  const params = { accountID, orders };
  const actionType = "batchNewOrder";
  const payload = { type: actionType, params };
  const payloadHash = hashExchangePayload(payload);
  const nonce = await getNonce(intent.userAddress);

  const session = prepareStore.create({
    userAddress: intent.userAddress.toLowerCase(),
    intent,
    accountID,
    nonce,
    domainName: "spot",
    actionType,
    params,
    payloadHash,
    preview,
    skipped,
    intentId,
  });

  const typedData = {
    domain: {
      name: "spot",
      version: "1",
      chainId: config.SODEX_CHAIN_ID,
      verifyingContract: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    },
    types: {
      ExchangeAction: [
        { name: "payloadHash", type: "bytes32" },
        { name: "nonce", type: "uint64" },
      ],
    },
    primaryType: "ExchangeAction" as const,
    message: { payloadHash, nonce },
  };

  return { session, typedData };
}
