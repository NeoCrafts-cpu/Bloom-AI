import LandingNavbar from "@/components/LandingNavbar";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle, Clock } from "lucide-react";

const PHASES = [
  {
    phase: "Phase 1",
    label: "Foundation & Real Data Pipeline",
    status: "done",
    items: [
      "SoSoValue Terminal API integration — ETF flows, news sentiment, market snapshots",
      "AI-generated Smart Money newsletters via OpenRouter LLM (GPT-4o-mini / Claude)",
      "SSI Index protocol — BLOOM-MAG7, BLOOM-RWA, BLOOM-DEFI on-chain strategies",
      "SoDEX on-chain execution via ValueChain Testnet (chain ID 138565)",
      "EIP-712 signed copy-trade intent system with wallet authorization",
      "WalletConnect + MetaMask support via wagmi v2",
      "In-memory TTL cache — stale-while-revalidate, 15s prices / 5min ETF / 2min news",
      "SoDEX as primary price source (no rate limits) with CoinGecko fallback",
      "Real account state + USDC balance from SoDEX /accounts/{address}/state",
      "Real symbol ID resolution from SoDEX /markets/symbols before every order",
      "Zero mock data — all panels show real API data or explicit error states",
      "Stale cache indicators (● Cached) on MarketTicker, ETF Flows, News panels",
      "Sentinel 6-rule deterministic risk circuit-breaker",
      "Multi-agent orchestration: Journalist → Strategist → Broker → Sentinel",
      "Enhanced /health endpoint with journalist status, cycle count, env key flags",
      "Chart Analyst agent — RSI-14, SMA-20/50, OpenRouter TA briefings every 2h",
      "OHLCV candlestick chart with volume histogram via SoDEX klines (lightweight-charts v5)",
      "30-day ETF flow history chart — SoSoValue summary-history (Recharts BarChart)",
      "DeFi TVL leaderboard — DefiLlama top 15 protocols with live change data",
      "Live L2 order book depth chart — SoDEX WebSocket with REST fallback",
      "Market heatmap — Recharts Treemap sized by market cap, colored by 24h change",
      "Perps positions dashboard — wagmi wallet + SoDEX perps account state + PnL",
      "VC funding rounds intel — SoSoValue fundraising endpoint with expandable cards",
    ],
  },
  {
    phase: "Phase 2",
    label: "Intelligence Layer",
    status: "active",
    items: [
      "StrategiesGrid live prices — replace static currentPrice with SoDEX WebSocket feed",
      "Subscriber leaderboard and social copy-trade profiles",
      "Institutional API access tier for hedge funds and algorithmic traders",
      "Alert system — price targets, RSI extremes, large ETF flow events",
      "Chart Analyst multi-timeframe confluence signals (4h + 1d alignment)",
    ],
  },
  {
    phase: "Phase 3",
    label: "Ecosystem Expansion",
    status: "upcoming",
    items: [
      "Bloom AI mobile app (iOS + Android)",
      "DAO governance for SSI index curation",
      "Native $BLOOM token and fee-sharing model",
      "Multi-LLM agent marketplace",
      "Integration with additional SoSoValue data verticals",
    ],
  },
  {
    phase: "Phase 4",
    label: "Institutional Scale",
    status: "upcoming",
    items: [
      "Prime brokerage integrations (custodians, OTC desks)",
      "Regulatory-compliant reporting suite",
      "White-label Bloom AI for asset managers",
      "On-chain fund creation via SSI Protocol",
      "Global expansion: EU, APAC markets",
    ],
  },
];

const statusIcon = {
  done: <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />,
  active: <Clock size={16} className="text-bloom-orange shrink-0 mt-0.5" />,
  upcoming: <Circle size={16} className="text-bloom-text-muted shrink-0 mt-0.5" />,
};

const statusLabel = {
  done: { text: "Completed", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  active: { text: "In Progress", cls: "text-bloom-orange bg-bloom-orange-dim border-bloom-border-hover" },
  upcoming: { text: "Upcoming", cls: "text-bloom-text-muted bg-white/5 border-bloom-border" },
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-bloom-bg relative overflow-hidden">
      {/* Background gradient mesh */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, rgba(232,97,10,0.6) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full opacity-5"
          style={{ background: "radial-gradient(ellipse, rgba(245,160,32,0.5) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10">
        <LandingNavbar />

        <div className="max-w-4xl mx-auto px-6 pt-36 pb-24">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="pill-badge mx-auto mb-4 w-fit">Product Roadmap</div>
          <h1 className="text-4xl md:text-5xl font-bold text-bloom-text mb-4 leading-tight">
            Building the{" "}
            <span className="orange-gradient-text">Agentic Finance</span>
            <br />
            Stack
          </h1>
          <p className="text-bloom-text-muted text-lg max-w-xl mx-auto">
            From newsletter to on-chain fill — our journey to make institutional-grade
            finance accessible to everyone.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-bloom-border" />

          <div className="space-y-10">
            {PHASES.map((phase, i) => {
              const { text, cls } = statusLabel[phase.status as keyof typeof statusLabel];
              return (
                <div key={i} className="relative pl-16">
                  {/* Dot on the timeline */}
                  <div
                    className={`absolute left-4 top-1.5 w-4 h-4 rounded-full border-2 -translate-x-1/2 ${
                      phase.status === "done"
                        ? "bg-emerald-400 border-emerald-400"
                        : phase.status === "active"
                        ? "bg-bloom-orange border-bloom-orange shadow-orange-glow"
                        : "bg-bloom-bg border-bloom-border"
                    }`}
                  />

                  <div className="glass-card p-6">
                    <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                      <div>
                        <p className="text-xs text-bloom-text-muted font-mono mb-1">{phase.phase}</p>
                        <h3 className="text-lg font-bold text-bloom-text">{phase.label}</h3>
                      </div>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full border ${cls}`}>
                        {text}
                      </span>
                    </div>

                    <ul className="space-y-2">
                      {phase.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-sm text-bloom-text-muted">
                          {statusIcon[phase.status as keyof typeof statusIcon]}
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-bloom-text-muted mb-6">
            Ready to start? The terminal is live today.
          </p>
          <Link href="/terminal" className="orange-btn inline-flex items-center gap-2 px-10 py-3 text-base">
            Open Terminal
            <ArrowUpRight size={18} />
          </Link>
        </div>
        </div>{/* /max-w-4xl */}
      </div>{/* /relative z-10 */}
    </div>
  );
}
