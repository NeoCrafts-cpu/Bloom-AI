/**
 * Bloom AI MCP Server
 *
 * Wraps SoSoValue Terminal API endpoints and SoDEX public market data
 * as MCP tools — enabling AI agents (Journalist, Strategist) to autonomously
 * discover and call these APIs within their reasoning loop without hardcoded
 * prompt engineering per endpoint.
 *
 * Uses @modelcontextprotocol/sdk (when available) — falls back to a minimal
 * tool registry if the SDK is not installed in the hackathon context.
 */

import { getETFFlows, getNewsSentiment, getMarketSnapshots, getLatestCryptoNews, getDefiLlamaTVL } from "../services/sosovalue.js";
import { getSpotTickers, getOrderBook } from "../services/sodex.js";

// ─── Tool Definition ──────────────────────────────────────────────────────────

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string; default?: unknown }>;
    required?: string[];
  };
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

// ─── Tool Registry ────────────────────────────────────────────────────────────

export const MCP_TOOLS: MCPTool[] = [
  {
    name: "get_etf_flows",
    description:
      "Fetch real-time Bitcoin and Ethereum spot ETF net inflow/outflow data from SoSoValue Terminal API. Returns daily net flows in USD and total AUM per ETF ticker (IBIT, FBTC, ETHA, etc.). Use this to detect institutional buying or selling pressure.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await getETFFlows();
    },
  },

  {
    name: "get_news_sentiment",
    description:
      "Fetch AI-generated news sentiment analysis from SoSoValue Terminal API. Returns recent news items with sentiment scores (-1 = bearish, +1 = bullish), titles, sources, and market tags. Use this to understand current market narrative direction.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of news items to return (1-20)",
          default: 10,
        },
      },
    },
    handler: async (input) => {
      const limit = typeof input.limit === "number" ? input.limit : 10;
      return await getNewsSentiment(limit);
    },
  },

  {
    name: "get_market_snapshots",
    description:
      "Fetch current crypto market prices, 24h price changes, and market caps for top assets (BTC, ETH, SOL, BNB, XRP). Falls back to CoinGecko free tier if SoSoValue API is unavailable.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await getMarketSnapshots();
    },
  },

  {
    name: "get_crypto_news",
    description:
      "Fetch the latest hot crypto news headlines from CryptoPanic. Returns titles, sources, and publication timestamps. Use alongside sentiment analysis for comprehensive narrative context.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await getLatestCryptoNews();
    },
  },

  {
    name: "get_defi_tvl",
    description:
      "Fetch Total Value Locked (TVL) rankings for top DeFi protocols from DefiLlama. Returns protocol names, TVL in USD, and 24h TVL changes. Use to detect capital rotation into or out of DeFi.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await getDefiLlamaTVL();
    },
  },

  {
    name: "get_sodex_tickers",
    description:
      "Fetch live market ticker data from SoDEX on-chain orderbook (price, 24h change, volume for all trading pairs). Use to verify execution prices before order submission.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await getSpotTickers();
    },
  },

  {
    name: "get_sodex_orderbook",
    description:
      "Fetch the current order book depth for a specific SoDEX trading pair. Returns top bids and asks with quantities. Use to estimate slippage before the Broker submits a large order.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Trading pair symbol, e.g. 'vBTC_vUSDC'",
        },
        limit: {
          type: "number",
          description: "Order book depth (default 20)",
          default: 20,
        },
      },
      required: ["symbol"],
    },
    handler: async (input) => {
      const symbol = String(input.symbol);
      const limit = typeof input.limit === "number" ? input.limit : 20;
      return await getOrderBook(symbol, limit);
    },
  },
];

// ─── MCP Tool Executor ─────────────────────────────────────────────────────────

export async function executeMCPTool(
  toolName: string,
  input: Record<string, unknown> = {},
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const tool = MCP_TOOLS.find((t) => t.name === toolName);
  if (!tool) {
    return { success: false, error: `Tool '${toolName}' not found` };
  }

  try {
    const result = await tool.handler(input);
    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/** List all available MCP tools (for agent discovery) */
export function listMCPTools(): { name: string; description: string }[] {
  return MCP_TOOLS.map(({ name, description }) => ({ name, description }));
}
