// ─── Market Data ────────────────────────────────────────────────────────────

export interface ETFFlowData {
  date: string;
  ticker: string;
  netInflow: number;
  totalAUM: number;
  change24h: number;
}

export interface NewsSentiment {
  id: string;
  title: string;
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  score: number; // -1 to 1
  publishedAt: string;
  source: string;
  tags: string[];
}

export interface MarketSnapshot {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
  updatedAt: string;
}

// ─── Newsletter / Journalist Agent ──────────────────────────────────────────

export interface SmartMoneyNewsletter {
  id: string;
  title: string;
  summary: string;
  body: string;
  narrative: "risk-on" | "risk-off" | "neutral" | "rotation";
  keyAssets: string[];
  etfFlows: ETFFlowData[];
  sentiment: NewsSentiment[];
  publishedAt: string;
  strategyId?: string; // linked SSI index
}

// ─── SSI Protocol ────────────────────────────────────────────────────────────

export interface SSIIndex {
  id: string;
  name: string;
  symbol: string;
  description: string;
  assets: SSIAssetWeight[];
  tvl: number;
  dailyFee: number; // 0.01% = 0.0001
  createdAt: string;
  rebalancedAt: string;
}

export interface SSIAssetWeight {
  symbol: string;
  address: string;
  weight: number; // 0-1
  currentPrice: number;
}

// ─── SoDEX Trading ──────────────────────────────────────────────────────────

export type OrderSide = 1 | 2; // 1=buy, 2=sell
export type OrderType = 1 | 2; // 1=limit, 2=market
export type TimeInForce = 1 | 2 | 3; // 1=GTC, 2=IOC, 3=GTX
export type PositionSide = 1 | 2; // 1=long, 2=short
export type Modifier = 0 | 1 | 2; // 0=none, 1=post-only, 2=reduce-only

export interface SpotOrderItem {
  clOrdID: string;
  side: OrderSide;
  type: OrderType;
  timeInForce: TimeInForce;
  price?: string; // DecimalString
  quantity?: string; // DecimalString
  funds?: string; // DecimalString (market buy only)
}

export interface PerpsOrderItem {
  clOrdID: string;
  modifier: Modifier;
  side: OrderSide;
  type: OrderType;
  timeInForce: TimeInForce;
  price?: string; // DecimalString
  quantity?: string; // DecimalString
  funds?: string; // DecimalString
  stopPrice?: string; // DecimalString
  stopType?: number;
  triggerType?: number;
  reduceOnly: boolean;
  positionSide: PositionSide;
}

export interface OrderFill {
  orderId: string;
  clOrdID: string;
  symbol: string;
  side: OrderSide;
  fillPrice: number;
  fillQuantity: number;
  status: "new" | "partial" | "filled" | "cancelled" | "rejected";
  timestamp: string;
}

// ─── Copy Trading ────────────────────────────────────────────────────────────

export interface CopyTradeIntent {
  strategyId: string;
  newsletterId: string;
  userAddress: string;
  allocationUSD: number;
  maxSlippageBps: number; // basis points e.g. 50 = 0.5%
}

export interface CopyTradeResult {
  intentId: string;
  sentinelStatus: "passed" | "blocked";
  sentinelReason?: string;
  orders: OrderFill[];
  totalExecutedUSD: number;
  timestamp: string;
}

// ─── Sentinel Risk ───────────────────────────────────────────────────────────

export interface SentinelCheck {
  rule: string;
  passed: boolean;
  actual: number | string;
  limit: number | string;
  message?: string;
}

export interface SentinelReport {
  intentId: string;
  passed: boolean;
  checks: SentinelCheck[];
  timestamp: string;
}

// ─── WebSocket Events ────────────────────────────────────────────────────────

export type WSEventType =
  | "NEWSLETTER_PUBLISHED"
  | "STRATEGY_CREATED"
  | "ORDER_SUBMITTED"
  | "ORDER_FILL"
  | "SENTINEL_TRIP"
  | "AGENT_STATUS"
  | "MARKET_UPDATE";

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: string;
}

// ─── Agent Status ─────────────────────────────────────────────────────────────

export type AgentName = "journalist" | "strategist" | "broker" | "sentinel";
export type AgentStatus = "idle" | "running" | "error" | "paused";

export interface AgentState {
  name: AgentName;
  status: AgentStatus;
  lastRun?: string;
  message?: string;
}
