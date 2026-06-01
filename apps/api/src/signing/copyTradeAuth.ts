import { ethers } from "ethers";
import { config } from "../config.js";

export interface CopyTradeAuthPayload {
  strategyId: string;
  allocationUSD: number;
  maxSlippageBps: number;
  userAddress: string;
  deadline: number;
  userSignature: string;
}

const COPY_TRADE_TYPES: Record<string, { name: string; type: string }[]> = {
  CopyTradeAuth: [
    { name: "strategyId", type: "string" },
    { name: "allocationUSD", type: "uint256" },
    { name: "maxSlippageBps", type: "uint256" },
    { name: "userAddress", type: "address" },
    { name: "deadline", type: "uint256" },
  ],
};

/**
 * Verify user's EIP-712 CopyTradeAuth signature before broker execution.
 */
export function verifyCopyTradeAuth(payload: CopyTradeAuthPayload): { valid: boolean; error?: string } {
  const { strategyId, allocationUSD, maxSlippageBps, userAddress, deadline, userSignature } = payload;

  if (!userSignature || !userSignature.startsWith("0x")) {
    return { valid: false, error: "Missing or invalid userSignature" };
  }

  if (Date.now() / 1000 > deadline) {
    return { valid: false, error: "Signature deadline expired" };
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(userAddress)) {
    return { valid: false, error: "Invalid userAddress" };
  }

  try {
    const domain = {
      name: "Bloom AI",
      version: "1",
      chainId: config.SODEX_CHAIN_ID,
    };

    const message = {
      strategyId,
      allocationUSD: BigInt(Math.round(allocationUSD)),
      maxSlippageBps: BigInt(maxSlippageBps),
      userAddress,
      deadline: BigInt(deadline),
    };

    const recovered = ethers.verifyTypedData(
      domain,
      COPY_TRADE_TYPES,
      message,
      userSignature,
    );

    if (recovered.toLowerCase() !== userAddress.toLowerCase()) {
      return { valid: false, error: "Signature does not match userAddress" };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Signature verification failed: ${(err as Error).message}` };
  }
}
