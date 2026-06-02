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
    score: number;
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
}
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
}
export interface SSIAssetWeight {
    symbol: string;
    address: string;
    weight: number;
    currentPrice: number;
}
export type OrderSide = 1 | 2;
export type OrderType = 1 | 2;
export type TimeInForce = 1 | 2 | 3;
export type PositionSide = 1 | 2;
export type Modifier = 0 | 1 | 2;
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
export interface CopyTradeIntent {
    strategyId: string;
    newsletterId: string;
    userAddress: string;
    allocationUSD: number;
    maxSlippageBps: number;
}
export interface CopyTradeResult {
    intentId: string;
    sentinelStatus: "passed" | "blocked";
    sentinelReason?: string;
    orders: OrderFill[];
    totalExecutedUSD: number;
    timestamp: string;
}
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
export type WSEventType = "NEWSLETTER_PUBLISHED" | "STRATEGY_CREATED" | "ORDER_SUBMITTED" | "ORDER_FILL" | "SENTINEL_TRIP" | "AGENT_STATUS" | "MARKET_UPDATE";
export interface WSEvent<T = unknown> {
    type: WSEventType;
    payload: T;
    timestamp: string;
}
export type AgentName = "journalist" | "strategist" | "broker" | "sentinel" | "chartanalyst";
export type AgentStatus = "idle" | "running" | "error" | "paused";
export interface AgentState {
    name: AgentName;
    status: AgentStatus;
    lastRun?: string;
    message?: string;
}
//# sourceMappingURL=index.d.ts.map