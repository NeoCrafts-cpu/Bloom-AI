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
  blockExplorerUrls: ["https://explorer-testnet.sosovalue.com"] as const,
};

/** MetaMask `wallet_addEthereumChain` params */
export const VALUECHAIN_WALLET_PARAMS = {
  chainId: VALUECHAIN_TESTNET.chainIdHex,
  chainName: VALUECHAIN_TESTNET.chainName,
  nativeCurrency: VALUECHAIN_TESTNET.nativeCurrency,
  rpcUrls: [...VALUECHAIN_TESTNET.rpcUrls],
  blockExplorerUrls: [...VALUECHAIN_TESTNET.blockExplorerUrls],
};
