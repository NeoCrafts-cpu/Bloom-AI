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
export const EXCHANGE_ACTION_TYPES: Record<string, { name: string; type: string }[]> = {
  ExchangeAction: [
    { name: "payloadHash", type: "bytes32" },
    { name: "nonce", type: "uint64" },
  ],
};

export function getExchangeDomain(domainName: "spot" | "futures") {
  return {
    name: domainName,
    version: "1",
    chainId: config.SODEX_CHAIN_ID,
    verifyingContract: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  };
}

/** Compact JSON + keccak256 — must match Go SDK / MetaMask payloadHash. */
export function hashExchangePayload(payload: {
  type: string;
  params: Record<string, unknown>;
}): string {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(payload)));
}

/**
 * Convert a standard ECDSA signature (MetaMask / ethers v=27|28) into SoDEX typedSig:
 * 0x01 ‖ r ‖ s ‖ yParity(0|1)
 */
export function normalizeEcdsaToTypedSig(rawSig: string): string {
  const sig = ethers.Signature.from(rawSig);
  const r = sig.r.replace(/^0x/, "").padStart(64, "0");
  const s = sig.s.replace(/^0x/, "").padStart(64, "0");
  const v = (sig.yParity & 1).toString(16).padStart(2, "0");
  return `0x01${r}${s}${v}`;
}

/** Verify MetaMask ExchangeAction signature recovers to expected address. */
export function verifyExchangeActionSignature(args: {
  domainName: "spot" | "futures";
  payloadHash: string;
  nonce: number;
  signature: string;
  expectedAddress: string;
}): { valid: boolean; recovered?: string; error?: string } {
  try {
    const recovered = ethers.verifyTypedData(
      getExchangeDomain(args.domainName),
      EXCHANGE_ACTION_TYPES,
      { payloadHash: args.payloadHash, nonce: args.nonce },
      args.signature,
    );
    if (recovered.toLowerCase() !== args.expectedAddress.toLowerCase()) {
      return {
        valid: false,
        recovered,
        error: `Signer ${recovered} does not match wallet ${args.expectedAddress}`,
      };
    }
    return { valid: true, recovered };
  } catch (err) {
    return { valid: false, error: `Invalid SoDEX signature: ${(err as Error).message}` };
  }
}

export async function buildTypedSignature(
  payload: { type: string; params: Record<string, unknown> },
  nonce: number,
  domainName: "spot" | "futures",
): Promise<{ typedSig: string; payloadHash: string }> {
  const payloadHash = hashExchangePayload(payload);
  const domain = getExchangeDomain(domainName);
  const message = { payloadHash, nonce };

  const wallet = new ethers.Wallet(config.SODEX_API_PRIVATE_KEY);
  const rawSig = await wallet.signTypedData(domain, EXCHANGE_ACTION_TYPES, message);
  const typedSig = normalizeEcdsaToTypedSig(rawSig);

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

/**
 * Format a DecimalString for SoDEX: floor to precision, then strip trailing zeros.
 * SoDEX rejects padded forms like "15.000000" / "0.500" — use "15" / "0.5".
 */
export function formatDecimalString(value: number, precision: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const p = Math.max(0, Math.min(18, Math.floor(precision)));
  const factor = 10 ** p;
  const floored = Math.floor(value * factor + 1e-12) / factor;
  return parseFloat(floored.toFixed(p)).toString();
}
