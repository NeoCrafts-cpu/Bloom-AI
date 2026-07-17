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

// ─── Verified Signal Ledger (forward refs for newsletter) ───────────────────

export type SignalSource = "journalist" | "chartanalyst" | "strategist" | "discovery";
export type SignalStatus = "open" | "executed" | "blocked" | "expired" | "resolved";

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
  strategyId?: string;
  source?: SignalSource;
  signalId?: string;
}

// ─── SSI Protocol ────────────────────────────────────────────────────────────

export type IndexPublisherStatus = "draft" | "published" | "archived";

export interface SSIIndex {
  id: string;
  name: string;
  symbol: string;
  description: string;
  assets: SSIAssetWeight[];
  tvl: number;
  dailyFee: number;
  createdAt: string;
  rebalancedAt: string;
  status?: IndexPublisherStatus;
  publisherAddress?: string;
  version?: number;
  signalId?: string;
  /** SoSoValue index ticker this SSI was mirrored from */
  sourceSosoIndexId?: string;
}

export interface SSIRebalanceEvent {
  id: string;
  strategyId: string;
  priorAssets: SSIAssetWeight[];
  newAssets: SSIAssetWeight[];
  reason: string;
  signalId?: string;
  timestamp: string;
}

export interface IndexComparison {
  idA: string;
  idB: string;
  weightDiffs: { symbol: string; weightA: number; weightB: number; delta: number }[];
  impliedNotionalA: number;
  impliedNotionalB: number;
}

/** SoSoValue official index vs Bloom SSI weight comparison */
export interface SoSoSsiComparison {
  sosoIndexId: string;
  sosoName: string;
  strategyId: string;
  strategyName: string;
  weightDiffs: { symbol: string; weightSoso: number; weightSsi: number; delta: number }[];
  impliedNotionalSoso: number;
  impliedNotionalSsi: number;
  notionalUSD: number;
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
/** 1=GTC, 2=FOK (unsupported), 3=IOC, 4=GTX — market orders must use IOC(3) */
export type TimeInForce = 1 | 2 | 3 | 4;
export type PositionSide = 1 | 2; // 1=long, 2=short
export type Modifier = 0 | 1 | 2; // 0=none, 1=post-only, 2=reduce-only

export interface SpotOrderItem {
  clOrdID: string;
  side: OrderSide;
  type: OrderType;
  timeInForce: TimeInForce;
  price?: string;
  quantity?: string;
  funds?: string;
}

export interface PerpsOrderItem {
  clOrdID: string;
  modifier: Modifier;
  side: OrderSide;
  type: OrderType;
  timeInForce: TimeInForce;
  price?: string;
  quantity?: string;
  funds?: string;
  stopPrice?: string;
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
  maxSlippageBps: number;
  signalId?: string;
  deadline?: number;
  userSignature?: string;
  /** Execution venue — spot (default) or perps when SODEX_ENABLE_PERPS_COPY=1 */
  venue?: "spot" | "perps";
  leverage?: number;
  /** market (default) or TWAP basket when SODEX_ENABLE_TWAP=1 */
  executionStyle?: "market" | "twap";
  /** TWAP window in seconds (60–86400) */
  twapDurationSec?: number;
}

export interface CopyTradeResult {
  intentId: string;
  sentinelStatus: "passed" | "blocked";
  sentinelReason?: string;
  orders: OrderFill[];
  totalExecutedUSD: number;
  timestamp: string;
  simulated?: boolean;
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
  | "STRATEGY_REBALANCED"
  | "ORDER_SUBMITTED"
  | "ORDER_FILL"
  | "SENTINEL_TRIP"
  | "AGENT_STATUS"
  | "MARKET_UPDATE"
  | "OPPORTUNITY_UPDATED"
  | "SIGNAL_RECORDED";

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: string;
}

// ─── Agent Status ─────────────────────────────────────────────────────────────

export type AgentName = "journalist" | "strategist" | "broker" | "sentinel" | "chartanalyst";
export type AgentStatus = "idle" | "running" | "error" | "paused";

export interface AgentState {
  name: AgentName;
  status: AgentStatus;
  lastRun?: string;
  message?: string;
}

// ─── Verified Signal Ledger ───────────────────────────────────────────────────

export interface SignalEvidence {
  source: string;
  label: string;
  value: string | number;
  module: "sosovalue" | "sodex" | "defillama" | "computed";
}

export interface VerifiedSignal {
  id: string;
  source: SignalSource;
  title: string;
  summary: string;
  publishedAt: string;
  narrative?: SmartMoneyNewsletter["narrative"];
  keyAssets: string[];
  newsletterId?: string;
  strategyId?: string;
  inputDigest: string;
  contentDigest: string;
  modelVersion?: string;
  status: SignalStatus;
  evidence: SignalEvidence[];
  score?: number;
}

export interface SignalOutcome {
  signalId: string;
  tradeId?: string;
  newsletterId?: string;
  strategyId: string;
  userAddress: string;
  entryNotionalUSD: number;
  exitNotionalUSD?: number;
  pnlUSD?: number;
  pnlBps?: number;
  horizonHours?: number;
  resolvedAt?: string;
  verification: {
    sentinelPassed: boolean;
    executionMode: "live" | "simulated";
    userSignatureHash?: string;
  };
}

export interface LedgerStats {
  totalSignals: number;
  openSignals: number;
  executedSignals: number;
  blockedSignals: number;
  resolvedSignals: number;
  bySource: Record<SignalSource, number>;
}

// ─── Opportunity Discovery ────────────────────────────────────────────────────

export type OpportunityAction = "copy" | "rebalance" | "watch";

export interface OpportunitySignal {
  name: string;
  score: number;
  maxScore: number;
  direction: "bullish" | "bearish" | "neutral";
  detail: string;
}

export interface OpportunityEvidence {
  module: string;
  label: string;
  value: string;
  available: boolean;
}

export interface OpportunityScore {
  id: string;
  symbol: string;
  rank: number;
  totalScore: number;
  maxScore: number;
  direction: "long" | "short" | "neutral";
  action: OpportunityAction;
  tradable: boolean;
  signals: OpportunitySignal[];
  evidence: OpportunityEvidence[];
  missingInputs: string[];
  thesis: string;
  signalId?: string;
  strategyId?: string;
  cachedAt: string;
  isStale: boolean;
}
