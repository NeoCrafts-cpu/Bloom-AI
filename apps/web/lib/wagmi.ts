import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

/** ValueChain L1 Testnet — SoDEX execution environment */
export const valueChainTestnet = defineChain({
  id: 138565,
  name: "ValueChain Testnet",
  nativeCurrency: { name: "VBC", symbol: "VBC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.sodex.dev"] },
  },
  blockExplorers: {
    default: {
      name: "ValueChain Explorer",
      url: "https://explorer-testnet.sosovalue.com",
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [valueChainTestnet, mainnet],
  connectors: [injected()],
  transports: {
    [valueChainTestnet.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});
