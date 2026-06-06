import { createConfig, http, createStorage, cookieStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";
import { VALUECHAIN_TESTNET } from "./valuechain";

/** ValueChain L1 Testnet — SoDEX execution environment */
export const valueChainTestnet = defineChain({
  id: VALUECHAIN_TESTNET.chainId,
  name: VALUECHAIN_TESTNET.chainName,
  nativeCurrency: VALUECHAIN_TESTNET.nativeCurrency,
  rpcUrls: {
    default: { http: [...VALUECHAIN_TESTNET.rpcUrls] },
  },
  blockExplorers: {
    default: {
      name: "ValueChain Testnet Explorer",
      url: VALUECHAIN_TESTNET.blockExplorerUrls[0],
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [valueChainTestnet],
  connectors: [injected()],
  transports: {
    [valueChainTestnet.id]: http(VALUECHAIN_TESTNET.rpcUrls[0]),
  },
  ssr: true,
  storage: createStorage({ storage: cookieStorage, key: "wagmi-vc-v4" }),
});
