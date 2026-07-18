import { ethers } from "ethers";
import { config } from "../config.js";
import type { AutoCopyGrantMessage } from "@bloom-ai/types";

export const AUTO_COPY_TYPES: Record<string, { name: string; type: string }[]> = {
  AutoCopyGrant: [
    { name: "userAddress", type: "address" },
    { name: "maxAllocationUSD", type: "uint256" },
    { name: "maxDailyUSD", type: "uint256" },
    { name: "maxSlippageBps", type: "uint256" },
    { name: "venue", type: "string" },
    { name: "expiresAt", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

export function autoCopyDomain() {
  return {
    name: "Bloom AI",
    version: "1",
    chainId: config.SODEX_CHAIN_ID,
  };
}

/**
 * Verify EIP-712 AutoCopyGrant — authorizes unattended copy-trade within limits.
 */
export function verifyAutoCopyGrant(
  grant: AutoCopyGrantMessage,
  signature: string,
): { valid: boolean; error?: string } {
  if (!signature?.startsWith("0x")) {
    return { valid: false, error: "Missing or invalid Auto-Copy grant signature" };
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(grant.userAddress)) {
    return { valid: false, error: "Invalid userAddress" };
  }
  if (!(grant.maxAllocationUSD > 0) || !(grant.maxDailyUSD > 0)) {
    return { valid: false, error: "Allocation limits must be positive" };
  }
  if (grant.maxAllocationUSD > grant.maxDailyUSD) {
    return { valid: false, error: "maxAllocationUSD cannot exceed maxDailyUSD" };
  }
  if (Date.now() / 1000 > grant.expiresAt) {
    return { valid: false, error: "Auto-Copy grant expired — re-enable from Trade" };
  }

  try {
    const message = {
      userAddress: grant.userAddress,
      maxAllocationUSD: BigInt(Math.round(grant.maxAllocationUSD)),
      maxDailyUSD: BigInt(Math.round(grant.maxDailyUSD)),
      maxSlippageBps: BigInt(Math.round(grant.maxSlippageBps)),
      venue: grant.venue,
      expiresAt: BigInt(grant.expiresAt),
      nonce: BigInt(grant.nonce),
    };
    const recovered = ethers.verifyTypedData(
      autoCopyDomain(),
      AUTO_COPY_TYPES,
      message,
      signature,
    );
    if (recovered.toLowerCase() !== grant.userAddress.toLowerCase()) {
      return { valid: false, error: "Grant signature does not match userAddress" };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Grant verification failed: ${(err as Error).message}` };
  }
}
