import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { verifyCopyTradeAuth } from "../src/signing/copyTradeAuth.js";

describe("CopyTradeAuth verification", () => {
  it("verifies valid signature", async () => {
    const wallet = ethers.Wallet.createRandom();
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const domain = { name: "Bloom AI", version: "1", chainId: 138565 };
    const types = {
      CopyTradeAuth: [
        { name: "strategyId", type: "string" },
        { name: "allocationUSD", type: "uint256" },
        { name: "maxSlippageBps", type: "uint256" },
        { name: "userAddress", type: "address" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const message = {
      strategyId: "ssi-mag7-003",
      allocationUSD: BigInt(100),
      maxSlippageBps: BigInt(50),
      userAddress: wallet.address,
      deadline: BigInt(deadline),
    };

    const sig = await wallet.signTypedData(domain, types, message);
    const result = verifyCopyTradeAuth({
      strategyId: "ssi-mag7-003",
      allocationUSD: 100,
      maxSlippageBps: 50,
      userAddress: wallet.address,
      deadline,
      userSignature: sig,
    });

    assert.equal(result.valid, true);
  });

  it("rejects expired deadline", () => {
    const result = verifyCopyTradeAuth({
      strategyId: "ssi-mag7-003",
      allocationUSD: 100,
      maxSlippageBps: 50,
      userAddress: "0x0000000000000000000000000000000000000001",
      deadline: 1,
      userSignature: "0x" + "00".repeat(65),
    });
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes("expired"));
  });
});
