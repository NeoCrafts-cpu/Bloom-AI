import { createConfig, http, createStorage, cookieStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

/** ValueChain L1 Testnet — SoDEX execution environment */
export const valueChainTestnet = defineChain({
  id: 138565,
  name: "ValueChain Testnet",
  nativeCurrency: { name: "SOSO", symbol: "SOSO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.valuechain.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "ValueChain Testnet Explorer",
      url: "https://testnet-scan.valuechain.xyz",
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [valueChainTestnet],
  connectors: [injected()],
  transports: {
    [valueChainTestnet.id]: http(),
  },
  ssr: true,
  // v2 — bump storage key so stale chain-138629 connections are dropped
  storage: createStorage({ storage: cookieStorage, key: "wagmi-vc-v2" }),
});
