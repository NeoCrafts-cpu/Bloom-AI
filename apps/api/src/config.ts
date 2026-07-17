import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  PORT: parseInt(process.env.PORT ?? "4000", 10),
  WEB_URL: process.env.WEB_URL ?? "http://localhost:3000",

  // SoSoValue Terminal API
  SOSOVALUE_API_KEY: process.env.SOSOVALUE_API_KEY ?? "",
  SOSOVALUE_BASE_URL:
    process.env.SOSOVALUE_BASE_URL ??
    "https://openapi.sosovalue.com/openapi/v1",

  // SoDEX — testnet (138565) or mainnet (286623)
  SODEX_NETWORK: (process.env.SODEX_NETWORK ?? "testnet") as "testnet" | "mainnet",
  SODEX_SPOT_URL:
    process.env.SODEX_SPOT_URL ??
    (process.env.SODEX_NETWORK === "mainnet"
      ? "https://mainnet-gw.sodex.dev/api/v1/spot"
      : "https://testnet-gw.sodex.dev/api/v1/spot"),
  SODEX_PERPS_URL:
    process.env.SODEX_PERPS_URL ??
    (process.env.SODEX_NETWORK === "mainnet"
      ? "https://mainnet-gw.sodex.dev/api/v1/perps"
      : "https://testnet-gw.sodex.dev/api/v1/perps"),
  SODEX_WS_SPOT:
    process.env.SODEX_WS_SPOT ??
    (process.env.SODEX_NETWORK === "mainnet"
      ? "wss://mainnet-gw.sodex.dev/ws/spot"
      : "wss://testnet-gw.sodex.dev/ws/spot"),
  SODEX_WS_PERPS:
    process.env.SODEX_WS_PERPS ??
    (process.env.SODEX_NETWORK === "mainnet"
      ? "wss://mainnet-gw.sodex.dev/ws/perps"
      : "wss://testnet-gw.sodex.dev/ws/perps"),
  SODEX_CHAIN_ID: parseInt(
    process.env.SODEX_CHAIN_ID ??
      (process.env.SODEX_NETWORK === "mainnet" ? "286623" : "138565"),
    10,
  ),
  SODEX_API_PRIVATE_KEY: process.env.SODEX_API_PRIVATE_KEY ?? "",
  SODEX_API_KEY_NAME: process.env.SODEX_API_KEY_NAME ?? "",
  SODEX_API_KEY_ADDRESS: process.env.SODEX_API_KEY_ADDRESS ?? "",
  SODEX_ENABLE_PERPS_COPY: process.env.SODEX_ENABLE_PERPS_COPY === "1",
  SODEX_ENABLE_TWAP: process.env.SODEX_ENABLE_TWAP === "1",

  // OpenRouter LLM
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? "",
  OPENROUTER_MODEL:
    process.env.OPENROUTER_MODEL ?? "~anthropic/claude-sonnet-latest",

  // External APIs (free tiers)
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY ?? "",
  CRYPTOPANIC_API_KEY: process.env.CRYPTOPANIC_API_KEY ?? "",

  // Redis
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",

  // Agent config
  JOURNALIST_INTERVAL_MS: parseInt(
    process.env.JOURNALIST_INTERVAL_MS ?? "600000", // 10 min
    10,
  ),

  // Sentinel risk limits
  SENTINEL_MAX_ORDER_USD: parseFloat(
    process.env.SENTINEL_MAX_ORDER_USD ?? "1000",
  ),
  SENTINEL_MAX_DAILY_USD: parseFloat(
    process.env.SENTINEL_MAX_DAILY_USD ?? "5000",
  ),
  SENTINEL_MAX_SLIPPAGE_BPS: parseInt(
    process.env.SENTINEL_MAX_SLIPPAGE_BPS ?? "100", // 1%
    10,
  ),
  SENTINEL_MAX_LEVERAGE: parseFloat(process.env.SENTINEL_MAX_LEVERAGE ?? "3"),
  SENTINEL_ATR_THRESHOLD_BPS: parseInt(
    process.env.SENTINEL_ATR_THRESHOLD_BPS ?? "1500", // 15% volatility proxy
    10,
  ),
  SENTINEL_MAX_CONSECUTIVE_LOSSES: parseInt(
    process.env.SENTINEL_MAX_CONSECUTIVE_LOSSES ?? "3",
    10,
  ),
  /** Hard-block copy-trades when a high-importance macro event is within ±N hours */
  SENTINEL_MACRO_GATE_HOURS: parseInt(
    process.env.SENTINEL_MACRO_GATE_HOURS ?? "12",
    10,
  ),
} as const;
