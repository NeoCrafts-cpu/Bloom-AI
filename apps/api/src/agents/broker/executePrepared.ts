import type { CopyTradeResult, OrderFill } from "@bloom-ai/types";
import { prepareStore } from "../../store/prepareStore.js";
import {
  normalizeEcdsaToTypedSig,
  verifyExchangeActionSignature,
} from "../../signing/eip712.js";
import {
  submitUserSignedSpotBatch,
  isCancelOnlyError,
  markSymbolCancelOnly,
} from "../../services/sodex.js";
import { wsManager } from "../../ws/manager.js";

/**
 * Finalize a prepare session with the user's MetaMask ExchangeAction signature.
 * Orders debit the user's own SoDEX USDC balance.
 */
export async function executePreparedUserTrade(args: {
  prepareId: string;
  sodexSignature: string;
  userAddress: string;
}): Promise<CopyTradeResult> {
  const session = prepareStore.take(args.prepareId);
  if (!session) {
    throw new Error("Prepare session expired or not found — click Sign & Execute again");
  }

  if (session.userAddress !== args.userAddress.toLowerCase()) {
    throw new Error("Connected wallet does not match the prepared trade");
  }

  const verified = verifyExchangeActionSignature({
    domainName: session.domainName,
    payloadHash: session.payloadHash,
    nonce: session.nonce,
    signature: args.sodexSignature,
    expectedAddress: args.userAddress,
  });
  if (!verified.valid) {
    throw new Error(verified.error ?? "SoDEX signature verification failed");
  }

  const typedSig = normalizeEcdsaToTypedSig(args.sodexSignature);
  const { brokerStatus } = await import("./index.js");
  brokerStatus.status = "running";
  brokerStatus.lastError = null;

  try {
    for (const leg of session.preview) {
      wsManager.broadcast({
        type: "ORDER_SUBMITTED",
        payload: {
          intentId: session.intentId,
          symbol: leg.symbol,
          allocationUSD: leg.allocationUSD,
          executionStyle: "market",
          source: "user-wallet",
        },
        timestamp: new Date().toISOString(),
      });
    }

    const rawFills = await submitUserSignedSpotBatch(
      session.params,
      typedSig,
      session.nonce,
      args.userAddress,
    );

    const byClOrd = new Map(session.preview.map((p) => [p.clOrdID, p]));
    const fills: OrderFill[] = [];

    for (const raw of rawFills ?? []) {
      const row = raw as {
        clOrdID: string;
        status?: string;
        message?: string;
        code?: number;
        orderID?: number;
      };
      const preview = byClOrd.get(row.clOrdID);
      if (typeof row.code === "number" && row.code !== 0) {
        const msg = row.message ?? String(row.code);
        if (isCancelOnlyError(msg)) continue;
        throw new Error(`SoDEX rejected ${preview?.symbol ?? row.clOrdID}: ${msg}`);
      }
      const accepted =
        row.status === "FILLED" ||
        row.status === "NEW" ||
        row.status === "filled" ||
        (typeof row.code === "number" && row.code === 0) ||
        !!row.orderID;

      const fill: OrderFill = {
        orderId: row.orderID ? String(row.orderID) : `${row.clOrdID}-fill`,
        clOrdID: row.clOrdID,
        symbol: preview?.symbol ?? "UNKNOWN/USDC",
        side: 1,
        fillPrice: preview?.price ?? 0,
        fillQuantity:
          preview && preview.price > 0 ? preview.allocationUSD / preview.price : 0,
        status: accepted ? "filled" : "new",
        timestamp: new Date().toISOString(),
      };
      fills.push(fill);
      wsManager.broadcast({
        type: "ORDER_FILL",
        payload: { ...fill, simulated: false, venue: "spot", source: "user-wallet" },
        timestamp: new Date().toISOString(),
      });
    }

    if (fills.length === 0) {
      throw new Error(
        `No SoDEX fills returned.` +
          (session.skipped.length ? ` Skipped: ${session.skipped.join(", ")}` : ""),
      );
    }

    const totalExecuted = fills.reduce((sum, f) => sum + f.fillPrice * f.fillQuantity, 0);
    const result: CopyTradeResult = {
      intentId: session.intentId,
      sentinelStatus: "passed",
      orders: fills,
      totalExecutedUSD: totalExecuted,
      timestamp: new Date().toISOString(),
      simulated: false,
      source: "manual",
    };

    brokerStatus.status = "idle";
    brokerStatus.lastRun = new Date().toISOString();
    brokerStatus.lastMessage = `User-wallet executed ${fills.length} orders for $${totalExecuted.toFixed(2)} — Account #${session.accountID}`;
    brokerStatus.cycleCount++;

    return result;
  } catch (err) {
    const msg = (err as Error).message;
    if (isCancelOnlyError(msg)) {
      for (const leg of session.preview) {
        if (leg.symbolID) markSymbolCancelOnly(leg.symbolID);
      }
      // Also mark from serialized orders if preview lacks symbolID
      for (const o of session.params.orders) {
        const sid = Number((o as { symbolID?: number }).symbolID);
        if (sid > 0) markSymbolCancelOnly(sid);
      }
    }
    brokerStatus.status = "error";
    brokerStatus.lastError = msg;
    throw err;
  }
}
