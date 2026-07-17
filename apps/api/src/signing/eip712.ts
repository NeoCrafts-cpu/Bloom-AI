import { ethers } from "ethers";
import { config } from "../config.js";

/**
 * Builds an EIP-712 typed signature for SoDEX API actions.
 *
 * Rules (must match Go SDK exactly):
 * 1. Payload is compact JSON (no whitespace) matching Go struct field order
 * 2. DecimalString fields (price, quantity, funds, stopPrice) are quoted strings
 * 3. omitempty fields must be absent when unset
 * 4. payloadHash = keccak256(compact payload bytes)
 * 5. Sign EIP-712 typed data with domain { name: "spot"|"futures", version:"1", chainId, verifyingContract: 0x000...0 }
 * 6. Prepend 0x01 byte to signature bytes → typedSig
 */
export async function buildTypedSignature(
  payload: { type: string; params: Record<string, unknown> },
  nonce: number,
  domainName: "spot" | "futures",
): Promise<{ typedSig: string; payloadHash: string }> {
  // Step 1: Compact JSON — JSON.stringify with no spaces
  const compactJson = JSON.stringify(payload);

  // Step 2: keccak256 of the UTF-8 encoded JSON
  const payloadBytes = ethers.toUtf8Bytes(compactJson);
  const payloadHash = ethers.keccak256(payloadBytes);

  // Step 3: EIP-712 domain
  const domain = {
    name: domainName,
    version: "1",
    chainId: config.SODEX_CHAIN_ID,
    verifyingContract: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  };

  // Step 4: Typed data types
  const types = {
    ExchangeAction: [
      { name: "payloadHash", type: "bytes32" },
      { name: "nonce", type: "uint64" },
    ],
  };

  // Step 5: Message
  const message = {
    payloadHash,
    nonce,
  };

  // Step 6: Sign with private key
  const wallet = new ethers.Wallet(config.SODEX_API_PRIVATE_KEY);
  const rawSig = await wallet.signTypedData(domain, types, message);

  // Step 7: Prepend 0x01 byte
  // rawSig is 0x + 130 hex chars (65 bytes). Strip 0x, prepend "01"
  const sigHex = rawSig.startsWith("0x") ? rawSig.slice(2) : rawSig;
  const typedSig = "0x01" + sigHex;

  return { typedSig, payloadHash };
}

/**
 * Enforce strict field ordering for PerpsOrderItem to match Go struct.
 * Field order: clOrdID, modifier, side, type, timeInForce,
 *              price, quantity, funds, stopPrice, stopType,
 *              triggerType, reduceOnly, positionSide
 */
export function serializePerpsOrder(order: {
  clOrdID: string;
  modifier: number;
  side: number;
  type: number;
  timeInForce: number;
  price?: string;
  quantity?: string;
  funds?: string;
  stopPrice?: string;
  stopType?: number;
  triggerType?: number;
  reduceOnly: boolean;
  positionSide: number;
}): Record<string, unknown> {
  const result: Record<string, unknown> = {
    clOrdID: order.clOrdID,
    modifier: order.modifier,
    side: order.side,
    type: order.type,
    timeInForce: order.timeInForce,
  };

  // DecimalString fields — only include if set (omitempty for optional)
  if (order.price !== undefined) result["price"] = order.price;
  if (order.quantity !== undefined) result["quantity"] = order.quantity;
  if (order.funds !== undefined) result["funds"] = order.funds;
  if (order.stopPrice !== undefined) result["stopPrice"] = order.stopPrice;
  if (order.stopType !== undefined) result["stopType"] = order.stopType;
  if (order.triggerType !== undefined) result["triggerType"] = order.triggerType;

  // Non-optional — always present even if zero/false
  result["reduceOnly"] = order.reduceOnly;
  result["positionSide"] = order.positionSide;

  return result;
}

/**
 * Serialize spot BatchNewOrderItem — field order must match Go SDK:
 * symbolID, clOrdID, side, type, timeInForce, price?, quantity?, funds?
 */
export function serializeSpotOrder(order: {
  symbolID: number;
  clOrdID: string;
  side: number;
  type: number;
  timeInForce: number;
  price?: string;
  quantity?: string;
  funds?: string;
}): Record<string, unknown> {
  const result: Record<string, unknown> = {
    symbolID: order.symbolID,
    clOrdID: order.clOrdID,
    side: order.side,
    type: order.type,
    timeInForce: order.timeInForce,
  };

  if (order.price !== undefined) result["price"] = order.price;
  if (order.quantity !== undefined) result["quantity"] = order.quantity;
  if (order.funds !== undefined) result["funds"] = order.funds;

  return result;
}

/** Format a decimal string to max precision without exceeding tick (floor). */
export function formatDecimalString(value: number, precision: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const p = Math.max(0, Math.min(18, Math.floor(precision)));
  const factor = 10 ** p;
  const floored = Math.floor(value * factor + 1e-12) / factor;
  return floored.toFixed(p);
}
