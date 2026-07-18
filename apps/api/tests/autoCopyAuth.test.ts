import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { AUTO_COPY_TYPES, autoCopyDomain, verifyAutoCopyGrant } from "../src/signing/autoCopyAuth.js";

describe("AutoCopyGrant EIP-712", () => {
  it("accepts a valid grant signature", async () => {
    const wallet = ethers.Wallet.createRandom();
    const prev = process.env.SODEX_CHAIN_ID;
    process.env.SODEX_CHAIN_ID = "138565";

    const grant = {
      userAddress: wallet.address,
      maxAllocationUSD: 40,
      maxDailyUSD: 200,
      maxSlippageBps: 50,
      venue: "spot" as const,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      nonce: Date.now(),
    };

    const message = {
      userAddress: grant.userAddress,
      maxAllocationUSD: BigInt(grant.maxAllocationUSD),
      maxDailyUSD: BigInt(grant.maxDailyUSD),
      maxSlippageBps: BigInt(grant.maxSlippageBps),
      venue: grant.venue,
      expiresAt: BigInt(grant.expiresAt),
      nonce: BigInt(grant.nonce),
    };

    const domain = autoCopyDomain();
    // Force testnet chain in case config already loaded
    domain.chainId = 138565;

    const sig = await wallet.signTypedData(domain, AUTO_COPY_TYPES, message);
    const result = verifyAutoCopyGrant(grant, sig);
    assert.equal(result.valid, true, result.error);

    if (prev === undefined) delete process.env.SODEX_CHAIN_ID;
    else process.env.SODEX_CHAIN_ID = prev;
  });

  it("rejects expired grants", async () => {
    const wallet = ethers.Wallet.createRandom();
    const grant = {
      userAddress: wallet.address,
      maxAllocationUSD: 40,
      maxDailyUSD: 200,
      maxSlippageBps: 50,
      venue: "spot" as const,
      expiresAt: Math.floor(Date.now() / 1000) - 10,
      nonce: 1,
    };
    const message = {
      userAddress: grant.userAddress,
      maxAllocationUSD: BigInt(40),
      maxDailyUSD: BigInt(200),
      maxSlippageBps: BigInt(50),
      venue: "spot",
      expiresAt: BigInt(grant.expiresAt),
      nonce: BigInt(1),
    };
    const domain = { ...autoCopyDomain(), chainId: 138565 };
    const sig = await wallet.signTypedData(domain, AUTO_COPY_TYPES, message);
    const result = verifyAutoCopyGrant(grant, sig);
    assert.equal(result.valid, false);
    assert.match(result.error ?? "", /expired/i);
  });
});
