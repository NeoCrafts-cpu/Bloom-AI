/** Shared ValueChain Testnet credentials (SoDEX execution environment). */

export const VALUECHAIN_TESTNET = {
  chainId: 138565,
  chainIdHex: "0x21D45" as const,
  chainName: "ValueChain Testnet",
  nativeCurrency: {
    name: "VBC",
    symbol: "VBC",
    decimals: 18,
  },
  rpcUrls: ["https://testnet-rpc.valuechain.xyz"] as const,
  /** Working testnet scan (explorer-testnet.sosovalue.com does not resolve) */
  blockExplorerUrls: ["https://test-scan.valuechain.xyz"] as const,
};

/** SoDEX testnet UI — fills are exchange events; verify here when no L1 tx hash */
export const SODEX_TESTNET_TRADE_URL = "https://testnet.sodex.com/trade/spot/BTC_USDC";

/** MetaMask `wallet_addEthereumChain` params */
export const VALUECHAIN_WALLET_PARAMS = {
  chainId: VALUECHAIN_TESTNET.chainIdHex,
  chainName: VALUECHAIN_TESTNET.chainName,
  nativeCurrency: VALUECHAIN_TESTNET.nativeCurrency,
  rpcUrls: [...VALUECHAIN_TESTNET.rpcUrls],
  blockExplorerUrls: [...VALUECHAIN_TESTNET.blockExplorerUrls],
};

/** Only hex tx hashes belong on the block explorer */
export function isOnChainTxHash(id: string | undefined | null): boolean {
  return !!id && /^0x[0-9a-fA-F]{64}$/.test(id);
}
