import LandingNavbar from "@/components/LandingNavbar";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle, Clock } from "lucide-react";

const PHASES = [
  {
    phase: "Phase 1",
    label: "Foundation & Agent Pipeline",
    status: "done",
    items: [
      "SoSoValue Terminal API — ETF flows, news sentiment, fundraising, currency data",
      "SoDEX testnet integration — tickers, klines, orderbook, account state, batch orders",
      "Five-agent pipeline: Journalist → Chart Analyst → Strategist → Sentinel → Broker",
      "POST /api/agents/pipeline/trigger — generates SSI index + sentinel dry-run",
      "Chart Analyst — SoDEX klines, RSI/SMA, OpenRouter with deterministic fallback",
      "Research page — live OHLCV charts, Signals tab, Confluence, Sentiment panels",
      "Copy-trade wizard — wagmi + MetaMask on ValueChain testnet (chain 138565)",
      "Sentinel — 8 deterministic risk rules with circuit breaker",
      "Broker — POST /api/broker/execute with real accountID + symbolID resolution",
      "Performance page — verified session trades only (no fabricated KPIs)",
      "MCP tool registry (7 tools) for Claude / Cursor",
      "WebSocket hub + SSE newsletter stream",
      "Smoke tests + DEMO.md verification checklist",
    ],
  },
  {
    phase: "Phase 2",
    label: "Buildathon Hardening & Live Production",
    status: "done",
    items: [
      "SoDEX API parsing fix — current field shapes (lastPx, object klines, time normalization)",
      "Removed static strategy catalog — pipeline-generated indices only",
      "Removed mock performance metrics (68% win rate, fake PnL curves, Kelly assumptions)",
      "Health endpoint probes live SoSoValue + SoDEX connectivity",
      "Chart Analyst trigger returns newsletter content (not empty agent status)",
      "Price meta.source tracking — seed/CoinGecko/SoDEX explicitly labeled",
      "AgentStatusBar polls live pipeline progress",
      "OpenRouter model updated to ~anthropic/claude-sonnet-latest",
      "Copy-trade audit trail + persisted trade store",
      "Explicit SIMULATED vs LIVE execution badges",
      "SoDEX signing hardening — DecimalString funds, yParity, batchNewOrder, cancel-only skip",
      "Auto-Copy grants — one EIP-712 signature, Sentinel-gated fills after pipeline",
      "Performance analytics — equity curve, by-asset / by-strategy, Auto-Copy vs manual",
      "Guided product journey — Home → Discover → News → Strategies → Trade → Results",
    ],
  },
  {
    phase: "Phase 3",
    label: "Intelligence & Discovery",
    status: "active",
    items: [
      "Opportunity Discovery Engine — ETF + sentiment + SoDEX TA scoring",
      "Verified Signal Ledger — evidence → thesis → execution → outcome proof chain",
      "Index Publisher Studio — off-chain composer with rebalance history",
      "Multi-timeframe confluence signals on Research page",
      "Alert system — RSI extremes, ETF flow events, price targets",
      "Deeper Auto-Copy attribution and social copy profiles (preview)",
    ],
  },
  {
    phase: "Phase 4",
    label: "Mainnet & Ecosystem",
    status: "upcoming",
    items: [
      "SoDEX mainnet deployment with real assets",
      "SSI Protocol on-chain index minting via SoSoValue Index API",
      "Social copy-trade profiles and subscriber leaderboard",
      "Perps copy-trade with leverage caps",
      "Institutional API tier with higher rate limits",
      "DAO governance for Sentinel rule changes",
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
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, rgba(232,97,10,0.6) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full opacity-5"
          style={{ background: "radial-gradient(ellipse, rgba(245,160,32,0.5) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10">
        <LandingNavbar />

        <div className="max-w-4xl mx-auto px-6 pt-36 pb-24">
          <div className="mb-16 text-center">
            <div className="pill-badge mx-auto mb-4 w-fit">Product Roadmap</div>
            <h1 className="text-4xl md:text-5xl font-bold text-bloom-text mb-4 leading-tight">
              Building the{" "}
              <span className="orange-gradient-text">Agentic Finance</span>
              <br />
              Stack
            </h1>
            <p className="text-bloom-text-muted text-lg max-w-xl mx-auto">
              From SoSoValue data ingestion to SoDEX on-chain fill — with no fabricated metrics
              and explicit live/stale/simulated states at every step.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-bloom-border" />

            <div className="space-y-10">
              {PHASES.map((phase, i) => {
                const { text, cls } = statusLabel[phase.status as keyof typeof statusLabel];
                return (
                  <div key={i} className="relative pl-16">
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

          <div className="mt-16 text-center">
            <p className="text-bloom-text-muted mb-6">
              Ready to verify? Run the pipeline, then open Research or Copy Trade.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/dashboard" className="orange-btn inline-flex items-center gap-2 px-8 py-3 text-base">
                Run Pipeline
                <ArrowUpRight size={18} />
              </Link>
              <Link href="/docs" className="orange-btn-outline inline-flex items-center gap-2 px-8 py-3 text-base">
                Read Docs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
