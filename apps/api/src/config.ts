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

  // SoDEX
  SODEX_SPOT_URL:
    process.env.SODEX_SPOT_URL ?? "https://testnet-gw.sodex.dev/api/v1/spot",
  SODEX_PERPS_URL:
    process.env.SODEX_PERPS_URL ??
    "https://testnet-gw.sodex.dev/api/v1/perps",
  SODEX_WS_SPOT:
    process.env.SODEX_WS_SPOT ?? "wss://testnet-gw.sodex.dev/ws/spot",
  SODEX_WS_PERPS:
    process.env.SODEX_WS_PERPS ?? "wss://testnet-gw.sodex.dev/ws/perps",
  SODEX_CHAIN_ID: parseInt(process.env.SODEX_CHAIN_ID ?? "138565", 10), // testnet
  SODEX_API_PRIVATE_KEY: process.env.SODEX_API_PRIVATE_KEY ?? "",
  SODEX_API_KEY_ADDRESS: process.env.SODEX_API_KEY_ADDRESS ?? "",

  // OpenRouter LLM
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? "",
  OPENROUTER_MODEL:
    process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet",

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
} as const;
