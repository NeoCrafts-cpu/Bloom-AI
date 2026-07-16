"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Brain, Layers, Zap, Shield, ChevronRight, BookOpen,
  Activity, Globe, Lock, ArrowUpRight, CheckCircle,
  Clock, Circle, Rocket, Code2, Cpu, FileText, BarChart3, Wallet,
  LineChart, TrendingUp,
} from "lucide-react";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

// ─── Sidebar sections ────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "overview",       label: "Overview",            icon: BookOpen   },
  { id: "architecture",   label: "Architecture",        icon: Cpu        },
  { id: "agents",         label: "AI Agents",           icon: Brain      },
  { id: "market",         label: "Market Intelligence", icon: BarChart3  },
  { id: "apis",           label: "API Reference",       icon: Code2      },
  { id: "strategies",     label: "Strategies (SSI)",    icon: Layers     },
  { id: "copy-trade",     label: "Copy Trade & SoDEX",  icon: Zap        },
  { id: "sentinel",       label: "Sentinel Risk Guard", icon: Shield     },
  { id: "mcp",            label: "MCP Tool Registry",   icon: Globe      },
  { id: "roadmap",        label: "Roadmap",             icon: Rocket     },
];

export default function DocsPage() {
  const [active, setActive] = useState("overview");

  return (
    <div className="min-h-screen bg-bloom-bg">
      <Navbar />
      <div className="pt-28 max-w-7xl mx-auto flex gap-0">

        {/* ── Sidebar ── */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-bloom-border min-h-[calc(100vh-7rem)] px-4 py-8 sticky top-28 self-start">
          <p className="text-xs font-semibold uppercase tracking-widest text-bloom-text-muted mb-4 px-2">
            Documentation
          </p>
          <nav className="space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left ${
                  active === s.id
                    ? "bg-bloom-orange-dim text-bloom-orange border border-bloom-border-hover font-semibold"
                    : "text-bloom-text-muted hover:text-bloom-text hover:bg-white/5"
                }`}
              >
                <s.icon size={14} className={active === s.id ? "text-bloom-orange" : "text-bloom-text-muted"} />
                {s.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 px-2">
            <div className="pill-badge-orange text-xs">
              <span className="live-dot" />
              v3.0 — Wave 3
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <main className="flex-1 px-6 lg:px-12 py-10 max-w-4xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease }}
            >
              {active === "overview"     && <SectionOverview     />}
              {active === "architecture" && <SectionArchitecture />}
              {active === "agents"       && <SectionAgents       />}
              {active === "market"       && <SectionMarket       />}
              {active === "apis"         && <SectionAPIs         />}
              {active === "strategies"   && <SectionStrategies   />}
              {active === "copy-trade"   && <SectionCopyTrade    />}
              {active === "sentinel"     && <SectionSentinel     />}
              {active === "mcp"          && <SectionMCP          />}
              {active === "roadmap"      && <SectionRoadmap      />}
            </motion.div>
          </AnimatePresence>

          {/* Section nav footer */}
          <div className="mt-16 pt-6 border-t border-bloom-border flex items-center justify-between text-sm">
            {(() => {
              const idx = SECTIONS.findIndex((s) => s.id === active);
              const prev = SECTIONS[idx - 1];
              const next = SECTIONS[idx + 1];
              return (
                <>
                  <div>
                    {prev && (
                      <button onClick={() => setActive(prev.id)} className="flex items-center gap-2 text-bloom-text-muted hover:text-bloom-text transition-colors">
                        <ChevronRight size={14} className="rotate-180" /> {prev.label}
                      </button>
                    )}
                  </div>
                  <div>
                    {next && (
                      <button onClick={() => setActive(next.id)} className="flex items-center gap-2 text-bloom-orange hover:text-bloom-orange-light transition-colors font-medium">
                        {next.label} <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function DocH1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-3xl font-bold text-bloom-text mb-3">{children}</h1>;
}
function DocH2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-bloom-text mt-10 mb-3 flex items-center gap-2">{children}</h2>;
}
function DocH3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-bloom-text mt-6 mb-2">{children}</h3>;
}
function DocP({ children }: { children: React.ReactNode }) {
  return <p className="text-bloom-text-muted leading-relaxed text-sm mb-4">{children}</p>;
}
function DocCode({ children }: { children: React.ReactNode }) {
  return <code className="bg-bloom-bg border border-bloom-border rounded-lg px-2 py-0.5 text-xs font-mono text-bloom-orange">{children}</code>;
}
function DocBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[#0f0c07] border border-bloom-border rounded-2xl p-4 text-xs font-mono text-bloom-text-muted overflow-x-auto mb-4 leading-relaxed">
      {children}
    </pre>
  );
}
function Badge({ children, color = "muted" }: { children: React.ReactNode; color?: "orange" | "muted" | "green" | "blue" }) {
  const cls = {
    orange: "bg-bloom-orange-dim border-bloom-border-hover text-bloom-orange",
    muted:  "bg-white/5 border-bloom-border text-bloom-text-muted",
    green:  "bg-emerald-900/30 border-emerald-800/40 text-emerald-400",
    blue:   "bg-blue-900/20 border-blue-800/30 text-blue-300",
  }[color];
  return <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border ${cls} mr-1.5 mb-1`}>{children}</span>;
}
function InfoCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="glass-card p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
          <Icon size={13} className="text-bloom-orange" />
        </div>
        <span className="text-sm font-semibold text-bloom-text">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
function SectionOverview() {
  return (
    <div>
      <div className="pill-badge-orange mb-4 w-fit"><span className="live-dot" />Live on SoDEX Testnet</div>
      <DocH1>Bloom AI — Agentic Financial Media & Execution Network</DocH1>
      <DocP>
        Bloom AI (AFMEN) is a fully agentic system that bridges real-world financial intelligence with on-chain execution.
        It transforms macro data — ETF fund flows, crypto sentiment, DeFi TVL, order book depth, VC funding rounds — into
        human-readable Smart Money newsletters, technical analysis briefings, on-chain index strategies, and executed
        copy-trades on SoDEX — all in a single autonomous loop. No fabricated user-facing metrics: every panel shows
        live API data, pipeline-generated artifacts, or an explicit empty/stale/unavailable state.
      </DocP>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {[
          { icon: Brain,     title: "5 AI Agents",              desc: "Journalist, Strategist, Broker, Sentinel, and Chart Analyst run autonomously — from raw data ingestion to on-chain execution and technical analysis." },
          { icon: Layers,    title: "SSI Protocol Native",      desc: "Strategies are minted as on-chain Wrapped Token indices via the SSI Protocol on ValueChain L1." },
          { icon: Zap,       title: "SoDEX Execution",         desc: "Every copy-trade fires EIP-712 signed orders directly to the SoDEX REST API with Sentinel pre-flight checks." },
          { icon: BarChart3, title: "8 Live Market Panels",    desc: "OHLCV charts, ETF history, DeFi TVL, L2 order book depth, market heatmap, perps positions, VC funding rounds — all live." },
        ].map((c) => (
          <motion.div key={c.title} whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <c.icon size={16} className="text-bloom-orange" />
              <span className="text-sm font-semibold text-bloom-text">{c.title}</span>
            </div>
            <p className="text-xs text-bloom-text-muted leading-relaxed">{c.desc}</p>
          </motion.div>
        ))}
      </div>

      <DocH2><BookOpen size={18} className="text-bloom-orange" />Quick Start</DocH2>
      <DocP>Clone the monorepo, install deps, configure environment variables, and run both servers:</DocP>
      <DocBlock>{`# 1. Install all workspace deps
npm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
# Fill in: SOSOVALUE_API_KEY, SODEX_API_KEY_NAME, SODEX_API_PRIVATE_KEY, OPENROUTER_API_KEY

# 3. Start the API server (port 4000)
cd apps/api && npx tsx src/index.ts

# 4. Start the frontend (port 3000)
cd apps/web && npx next dev --port 3000`}</DocBlock>

      <DocH2><Globe size={18} className="text-bloom-orange" />Pages</DocH2>
      <div className="space-y-2">
        {[
          { path: "/",           desc: "Landing page — hero, stats, agent showcase, integration stack" },
          { path: "/dashboard",  desc: "Live AI newsletter feed with SSE updates + agent status bar" },
          { path: "/terminal",   desc: "Smart Money Terminal — full newsletter reader with strategy links" },
          { path: "/research",   desc: "Market intelligence — OHLCV charts, Signals, Confluence, Sentiment" },
          { path: "/strategies", desc: "Pipeline-generated SSI indices — empty until Run Full Pipeline" },
          { path: "/copy-trade", desc: "4-step wizard — MetaMask → strategy → Sentinel → SoDEX" },
          { path: "/performance", desc: "Verified session trades only — no fabricated KPIs" },
          { path: "/roadmap",    desc: "Product roadmap — phases 1–4" },
          { path: "/docs",       desc: "This documentation page" },
        ].map((p) => (
          <div key={p.path} className="flex items-center gap-3 py-2 border-b border-bloom-border last:border-0">
            <DocCode>{p.path}</DocCode>
            <span className="text-xs text-bloom-text-muted">{p.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ARCHITECTURE ──────────────────────────────────────────────────────────────
function SectionArchitecture() {
  return (
    <div>
      <DocH1>Architecture</DocH1>
      <DocP>
        Bloom AI is a TypeScript monorepo with three workspaces: a Next.js 15 frontend, a Fastify 4 API backend,
        and a shared types package. The API runs five autonomous agents in the same Node.js process, connected via
        an in-process WebSocket hub that fans out to SSE and WS clients.
      </DocP>

      <DocH2><Cpu size={18} className="text-bloom-orange" />Monorepo Structure</DocH2>
      <DocBlock>{`bloom-ai/
├── apps/
│   ├── api/                     # Fastify 4 + TypeScript ESM (port 4000)
│   │   └── src/
│   │       ├── agents/
│   │       │   ├── journalist/  # SoSoValue polling + LLM newsletter generation
│   │       │   ├── chartanalyst/# SoDEX klines → RSI/SMA → TA briefing
│   │       │   ├── strategist/  # Narrative → SSI portfolio weights (pipeline-generated)
│   │       │   ├── broker/      # EIP-712 order construction + SoDEX submission
│   │       │   └── sentinel/    # Deterministic 8-rule circuit breaker
│   │       ├── lib/
│   │       │   ├── cache.ts     # In-memory TTL cache (stale-while-revalidate)
│   │       │   └── sodexParse.ts# SoDEX ticker/klines field normalization
│   │       ├── mcp/             # MCP tool registry (7 tools)
│   │       ├── routes/          # REST API route handlers
│   │       └── services/
│   │           ├── sosovalue.ts # SoSoValue Terminal API (ETF, news, prices)
│   │           ├── sodex.ts     # SoDEX REST — tickers, orderbook, account state
│   │           ├── eip712.ts    # Typed data helpers
│   │           └── wsManager.ts # In-process WebSocket hub
│   └── web/                     # Next.js 15 App Router (port 3000)
│       ├── app/                 # Pages (layout, page, route)
│       └── components/          # React client components
└── packages/
    └── types/                   # Shared TypeScript types`}</DocBlock>

      <DocH2><Activity size={18} className="text-bloom-orange" />TTL Cache Layer</DocH2>
      <DocP>
        All external API calls go through a shared in-memory TTL cache at <DocCode>apps/api/src/lib/cache.ts</DocCode>.
        The cache implements stale-while-revalidate semantics — if a fetch fails, it serves the last good response rather than throwing.
        Each cache entry returns <DocCode>{"{ data, cachedAt, isStale }"}</DocCode> so the frontend can show staleness indicators.
      </DocP>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
        {[
          { label: "Market prices",    ttl: "15 seconds",  key: "TTL.MARKET_PRICES" },
          { label: "News sentiment",   ttl: "2 minutes",   key: "TTL.NEWS_SENTIMENT" },
          { label: "ETF flows",        ttl: "5 minutes",   key: "TTL.ETF_FLOWS" },
          { label: "SoDEX symbols",    ttl: "10 minutes",  key: "TTL.SODEX_SYMBOLS" },
          { label: "Account state",    ttl: "30 seconds",  key: "TTL.ACCOUNT_STATE" },
        ].map((t) => (
          <div key={t.key} className="glass-card p-3">
            <p className="text-[10px] text-bloom-text-muted font-mono mb-0.5">{t.key}</p>
            <p className="text-xs font-semibold text-bloom-text">{t.label}</p>
            <p className="text-xs text-bloom-orange">{t.ttl}</p>
          </div>
        ))}
      </div>
      <DocBlock>{`// Usage pattern in services:
import { cache, TTL } from "../lib/cache.js";

// Returns { data: T, cachedAt: number, isStale: boolean }
const result = await cache.get("etf-flows", TTL.ETF_FLOWS, fetchFromSoSoValue);

// Stale-while-revalidate: if fetchFromSoSoValue throws and
// there is a previous entry, it returns { data: oldData, isStale: true }
// instead of propagating the error to the client.`}</DocBlock>

      <DocH2><Activity size={18} className="text-bloom-orange" />Data Flow</DocH2>
      <div className="space-y-3 mb-6">
        {[
          { step: "0", title: "POST /api/agents/pipeline/trigger",        desc: "Orchestrates the full pipeline: Journalist → Chart Analyst → Strategist → Sentinel preview. Run this from the dashboard before visiting /strategies or /copy-trade." },
          { step: "1", title: "Journalist polls every 10 min (TTL cached)", desc: "Fetches ETF flows (5min TTL), news sentiment (2min TTL), and market snapshots from SoDEX first, then CoinGecko as fallback (15s TTL) → builds LLM prompt → publishes SmartMoneyNewsletter via OpenRouter (template fallback if key missing)." },
          { step: "2", title: "Chart Analyst runs on schedule or trigger", desc: "Fetches SoDEX klines (sorted ascending for charts), computes RSI/SMA → publishes TA briefing newsletter. POST /api/agents/chartanalyst/trigger returns the newsletter object directly." },
          { step: "3", title: "Strategist receives newsletter",            desc: "Derives narrative type (risk-on / risk-off / rotation) → maps to SSI index weights with live SoDEX prices → stores SSIIndex in strategyStore (empty until pipeline runs)." },
          { step: "4", title: "Sentinel preview + user Copy Trade",         desc: "Pipeline runs sentinel dry-run. User confirms copy-trade → POST /api/broker/execute → Broker resolves accountID + symbolIDs → Sentinel runs 8 checks → EIP-712 signed orders to SoDEX REST." },
          { step: "5", title: "Order fills + verified performance",       desc: "SoDEX returns fills → tradeStore persists session trades → /performance shows verified stats only (no fabricated win rates or PnL curves)." },
        ].map((s) => (
          <div key={s.step} className="flex gap-4 glass-card p-4">
            <div className="w-7 h-7 rounded-full bg-bloom-orange flex items-center justify-center shrink-0 text-xs font-bold text-bloom-bg">{s.step}</div>
            <div>
              <p className="text-sm font-semibold text-bloom-text mb-0.5">{s.title}</p>
              <p className="text-xs text-bloom-text-muted">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <DocH2><Code2 size={18} className="text-bloom-orange" />Tech Stack</DocH2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { layer: "Frontend",    tech: "Next.js 15.5 · App Router · Tailwind CSS · Framer Motion · React Query" },
          { layer: "Backend",     tech: "Fastify 4 · TypeScript ESM · tsx watch · WebSocket · SSE" },
          { layer: "Blockchain",  tech: "EIP-712 typed data · SoDEX REST API · ValueChain L1 (Testnet 138565)" },
          { layer: "AI / LLM",   tech: "OpenRouter API · RAG pipeline · Journalist narrative generation" },
          { layer: "Data",        tech: "SoSoValue Terminal API · CoinGecko · CryptoPanic · DefiLlama" },
          { layer: "Protocol",    tech: "SSI Protocol · Wrapped Token indices · On-chain rebalancing" },
        ].map((r) => (
          <div key={r.layer} className="glass-card p-4">
            <p className="text-xs font-semibold text-bloom-orange mb-1">{r.layer}</p>
            <p className="text-xs text-bloom-text-muted leading-relaxed">{r.tech}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AGENTS ────────────────────────────────────────────────────────────────────
function SectionAgents() {
  return (
    <div>
      <DocH1>AI Agents</DocH1>
      <DocP>
        Bloom AI runs five specialized agents in the same Node.js process. Each agent has a defined responsibility
        in the pipeline from raw data to on-chain execution. Four agents are LLM-assisted; the Sentinel is
        intentionally deterministic and non-AI.
      </DocP>

      {[
        {
          icon: Brain, name: "The Journalist", role: "Data Ingestion & Narrative Generation",
          color: "rgba(232,97,10,0.12)",
          desc: "The Journalist is the entry point of the Bloom AI pipeline. It runs on a configurable interval (default 10 minutes) and performs three tasks: polls the SoSoValue Terminal API for ETF fund flows, AI news sentiment, and market snapshots; constructs a structured LLM prompt with the fetched data; and publishes a SmartMoneyNewsletter via OpenRouter (GPT-4o / Claude).",
          details: [
            { k: "Interval",    v: "600,000ms (10 min) — configurable via env" },
            { k: "LLM",         v: "OpenRouter (~anthropic/claude-sonnet-latest) with template fallback" },
            { k: "Data sources", v: "SoSoValue ETF flows, news sentiment, SoDEX/CoinGecko prices" },
            { k: "Output",      v: "SmartMoneyNewsletter — stored in newsletterStore, broadcast via WS" },
          ],
          code: `// apps/api/src/agents/journalist/index.ts
export async function runJournalistCycle(): Promise<void> {
  const [flows, sentiment, snapshots] = await Promise.all([
    fetchETFFlows(), fetchNewsSentiment(), fetchMarketSnapshots(),
  ]);
  const narrative = await generateNarrative(flows, sentiment, snapshots);
  newsletterStore.push(narrative);
  wsManager.broadcast("JOURNALIST_PUBLISHED", narrative);
}`,
        },
        {
          icon: Layers, name: "The Strategist", role: "Portfolio Generation",
          color: "rgba(245,160,32,0.10)",
          desc: "The Strategist listens for new newsletters from the Journalist and translates their narrative type into concrete portfolio weights. It classifies narratives as risk-on, risk-off, or rotation and applies a preset weight map to key assets with live SoDEX prices. The resulting SSIIndex is stored in strategyStore — the strategies page is empty until the pipeline runs.",
          details: [
            { k: "Trigger",     v: "Pipeline trigger or post-Journalist cycle" },
            { k: "Risk-on",     v: "BTC 35% · ETH 30% · SOL 35%" },
            { k: "Risk-off",    v: "BTC 55% · ETH 25% · LINK 20%" },
            { k: "Rotation",    v: "Equal weight across all keyAssets" },
            { k: "Output",      v: "SSIIndex in strategyStore (no static seed catalog)" },
          ],
          code: `// Narrative → weights mapping
function deriveWeights(narrative: string, keyAssets: string[]) {
  if (narrative.includes("risk-on"))
    return { BTC: 0.35, ETH: 0.30, SOL: 0.35 };
  if (narrative.includes("risk-off"))
    return { BTC: 0.55, ETH: 0.25, LINK: 0.20 };
  // rotation: equal weight all key assets
  const w = 1 / keyAssets.length;
  return Object.fromEntries(keyAssets.map(a => [a, w]));
}`,
        },
        {
          icon: Zap, name: "The Broker", role: "Copy-Trade Execution",
          color: "rgba(232,97,10,0.12)",
          desc: "The Broker handles the final execution step. When a user submits a copy-trade intent, the Broker constructs EIP-712 typed data payloads for each asset in the strategy, signs them with the configured private key, and submits them to the SoDEX REST API. It maps strategy assets to SoDEX trading pairs, handles per-asset allocation, and broadcasts ORDER_SUBMITTED and ORDER_FILL events via the WS hub.",
          details: [
            { k: "Endpoint",    v: "POST /api/broker/execute" },
            { k: "Signing",     v: "EIP-712 typed data (strict field order, DecimalString)" },
            { k: "Chain IDs",   v: "Testnet: 138565 · Mainnet: 286623" },
            { k: "Errors",      v: "Propagates SoDEX API errors — no silent mock fills" },
            { k: "Output",      v: "OrderFill[] + simulated flag when credentials missing" },
          ],
          code: `// EIP-712 order construction
const domain = { name: "SoDEX", version: "1", chainId: 138565 };
const order = {
  clOrdID: nanoid(),
  symbol:  "BTC-USDT",
  side:    "Buy",
  orderQtyDec: "0.001",  // DecimalString — SoDEX spec
  ...
};
const sig = await signTypedData(privateKey, domain, types, order);`,
        },
        {
          icon: Shield, name: "The Sentinel", role: "Deterministic Risk Guard",
          color: "rgba(245,160,32,0.10)",
          desc: "The Sentinel is a non-AI, fully deterministic circuit breaker. It runs eight rules against every copy-trade payload before the Broker submits anything to SoDEX. If any rule fails, the trade is blocked and a SentinelReport is returned with the exact rule that triggered. See the Sentinel section for the full rule list.",
          details: [
            { k: "Rules",       v: "8 deterministic checks — see Sentinel Risk Guard section" },
            { k: "Endpoint",    v: "POST /api/sentinel/check" },
            { k: "Pipeline",    v: "Dry-run preview during POST /api/agents/pipeline/trigger" },
            { k: "Output",      v: "SentinelReport with per-rule pass/fail" },
          ],
          code: `// apps/api/src/agents/sentinel/index.ts — 8 rules including:
// MAX_ORDER_USD, MAX_SLIPPAGE_BPS, MAX_DAILY_USD, POSITIVE_ALLOCATION,
// VALID_USER_ADDRESS, VALID_STRATEGY_ID, ATR_VOLATILITY_FILTER, CIRCUIT_BREAKER`,
        },
        {
          icon: LineChart, name: "The Chart Analyst", role: "Technical Analysis — RSI · SMA · Pattern Recognition",
          color: "rgba(232,97,10,0.12)",
          desc: "The Chart Analyst fetches 24h OHLCV klines for BTC, ETH, and SOL from the SoDEX spot API, computes RSI-14 and Simple Moving Averages, and passes the computed metrics into an OpenRouter LLM to generate a structured technical analysis briefing. It runs on a 2-hour cycle to avoid API rate limits while ensuring dashboards always have a fresh TA snapshot.",
          details: [
            { k: "Interval",     v: "5 min initial delay, then every 2 hours" },
            { k: "LLM",          v: "OpenRouter API (model configurable via OPENROUTER_MODEL)" },
            { k: "Data sources", v: "SoDEX klines endpoint — 96 × 15-min candles per symbol" },
            { k: "Indicators",   v: "RSI-14, SMA-20, SMA-50, price vs. SMA cross signals" },
            { k: "Trigger",      v: "POST /api/agents/chartanalyst/trigger — returns newsletter in response" },
            { k: "Fallback",     v: "Deterministic TA template when OpenRouter unavailable" },
            { k: "Output",       v: "SmartMoneyNewsletter (type: chartanalyst) — newsletterStore + WS" },
          ],
          code: `// apps/api/src/agents/chartanalyst/index.ts
export async function runChartAnalystCycle(): Promise<void> {
  const symbols = ["BTC", "ETH", "SOL"];
  const analyses = await Promise.all(symbols.map(async (sym) => {
    const klines = await getKlines(sym, "15m", 96);
    const closes  = klines.map((k) => k.close);
    return { symbol: sym, rsi14: computeRSI(closes, 14), sma20: computeSMA(closes, 20) };
  }));
  const briefing = await generateTABriefing(analyses);
  newsletterStore.push(briefing);
  wsManager.broadcast("CHARTANALYST_PUBLISHED", briefing);
}`,
        },
      ].map((agent) => (
        <div key={agent.name} className="mb-10">
          <div className="glass-card p-6 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: agent.color }}>
                <agent.icon size={20} className="text-bloom-orange" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-bloom-text">{agent.name}</h2>
                <p className="text-xs text-bloom-text-muted uppercase tracking-wider">{agent.role}</p>
              </div>
            </div>
            <DocP>{agent.desc}</DocP>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {agent.details.map((d) => (
                <div key={d.k} className="flex gap-2 text-xs">
                  <span className="text-bloom-orange font-semibold shrink-0">{d.k}:</span>
                  <span className="text-bloom-text-muted">{d.v}</span>
                </div>
              ))}
            </div>
            <DocBlock>{agent.code}</DocBlock>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MARKET INTELLIGENCE ───────────────────────────────────────────────────────
function SectionMarket() {
  const panels = [
    { icon: LineChart,  title: "OHLCV Candlestick Chart",    lib: "lightweight-charts v5",  desc: "Real-time OHLCV candlestick chart with volume overlay on the main pane. Klines sorted ascending (SoDEX returns newest-first). Testnet candles may look flat when OHLC values are identical. Symbols: BTC, ETH, SOL, BNB, AVAX. Intervals: 15m, 1h, 4h, 1d.", endpoints: ["GET /api/market/klines/:symbol?interval=1h&limit=96"] },
    { icon: TrendingUp, title: "ETF 30-Day History Chart",   lib: "Recharts BarChart",      desc: "Bar chart showing 30 days of BTC ETF net inflow history with green (inflow) / red (outflow) color coding. Fetches from SoSoValue summary-history endpoint. Includes cumulative inflow overlay and 30-day total.", endpoints: ["GET /api/market/etf-history?symbol=BTC&limit=30"] },
    { icon: BarChart3,  title: "DeFi TVL Leaderboard",       lib: "Custom list UI",         desc: "Top 15 DeFi protocols by Total Value Locked, sourced from DefiLlama. Shows protocol logo, category badge, TVL bar (relative), 24h change, and total TVL header. Refreshes every 3 minutes.", endpoints: ["GET /api/market/defi-tvl"] },
    { icon: Globe,      title: "Live L2 Order Book",         lib: "Recharts AreaChart",     desc: "Connects via native browser WebSocket to the SoDEX gateway. Subscribes to l2book updates for vBTC_vUSDC. Renders cumulative bid/ask depth as a split AreaChart. Ping keepalive every 30s. Falls back to REST poll every 4s if WebSocket is unavailable.", endpoints: ["WSS wss://testnet-gw.sodex.dev/ws/spot", "GET /api/market/sodex/orderbook/:symbol"] },
    { icon: Activity,   title: "Market Heatmap",             lib: "Recharts Treemap",       desc: "Treemap visualization where each cell is sized by market cap and colored by 24h price change (green = up, red = down). Custom cell renderer draws symbol labels. Gainers/losers mini-leaderboard below.", endpoints: ["GET /api/market/heatmap"] },
    { icon: Wallet,     title: "Perps Positions Panel",      lib: "wagmi + viem",           desc: "Connects to wagmi/viem for wallet address. Fetches the user's perps account state from SoDEX — USDC balance, open positions table with entry price, current mark price, unrealized PnL, and margin ratio.", endpoints: ["GET /api/market/perps/:address/state"] },
    { icon: Zap,        title: "VC Funding Rounds",          lib: "SoSoValue fundraising",  desc: "Displays VC funding round history for top crypto assets. Expandable cards show round type, date, amount raised, investors, and implied valuation. Data from SoSoValue's fundraising endpoint with 30min TTL.", endpoints: ["GET /api/market/fundraising/BTC", "GET /api/market/fundraising/ETH"] },
    { icon: FileText,   title: "ETF Flows Panel",            lib: "Recharts / SoSoValue",   desc: "Live ETF inflow/outflow for top BTC/ETH ETFs. Shows per-ETF flow bars with net total header. Color-coded: green = inflow, red = outflow. 5-minute TTL cache on the server.", endpoints: ["GET /api/market/etf-flows"] },
  ];

  return (
    <div>
      <DocH1>Market Intelligence Panels</DocH1>
      <DocP>
        All 8 market intelligence panels are lazy-loaded with{" "}
        <code className="text-bloom-orange">dynamic(() =&gt; import(...), {"{"} ssr: false {"}"})</code>{" "}
        to prevent SSR hydration mismatches. Each panel fetches its own data independently with a stale-while-revalidate
        pattern — a loading skeleton is shown until data arrives, and error states fall through gracefully.
      </DocP>
      <div className="grid grid-cols-1 gap-6">
        {panels.map((p) => (
          <div key={p.title} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-bloom-orange-dim border border-bloom-border-hover">
                <p.icon size={16} className="text-bloom-orange" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-bloom-text">{p.title}</h3>
                <Badge color="muted">{p.lib}</Badge>
              </div>
            </div>
            <DocP>{p.desc}</DocP>
            <div className="flex flex-wrap gap-2 mt-3">
              {p.endpoints.map((e) => (
                <code key={e} className="text-xs bg-white/5 border border-bloom-border rounded px-2 py-1 text-bloom-orange">{e}</code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── APIS ──────────────────────────────────────────────────────────────────────
function SectionAPIs() {
  const endpoints = [
    { method: "GET",  path: "/health",                              desc: "Server health — live SoSoValue + SoDEX probes, execution mode, agent status",   res: `{ status, integrations: { sodex: { ok }, sosovalue: { ok } }, priceSource, executionMode, agents: AgentState[] }` },
    { method: "POST", path: "/api/agents/pipeline/trigger",       desc: "Run full pipeline: Journalist → Chart Analyst → Strategist → Sentinel preview", res: `{ "data": { newsletter, strategy, sentinelReport }, "agents": AgentState[] }` },
    { method: "POST", path: "/api/agents/chartanalyst/trigger",    desc: "Manually trigger Chart Analyst — returns TA newsletter",                      res: `{ "data": SmartMoneyNewsletter, "agent": AgentState }` },
    { method: "GET",  path: "/api/newsletters",                     desc: "List published newsletters (newest first)",                  res: `{ "data": SmartMoneyNewsletter[] }` },
    { method: "GET",  path: "/api/newsletters/stream",              desc: "SSE stream — INITIAL bulk + live JOURNALIST_PUBLISHED events",res: `event: data\ndata: { type, payload }` },
    { method: "POST", path: "/api/newsletters/trigger",             desc: "Manually trigger a Journalist cycle",                       res: `{ "data": SmartMoneyNewsletter }` },
    { method: "GET",  path: "/api/strategies",                      desc: "List all SSI index strategies",                             res: `{ "data": SSIIndex[] }` },
    { method: "GET",  path: "/api/agents",                          desc: "Live status of all five agents (journalist, strategist, broker, sentinel, chartanalyst)", res: `{ "data": AgentState[] }` },
    { method: "GET",  path: "/api/market/prices",                   desc: "Live prices — SoDEX first, CoinGecko fallback, TTL 15s",    res: `{ "data": MarketSnapshot[], "meta": { cachedAt, isStale, source: "sodex"|"coingecko"|"seed" } }` },
    { method: "GET",  path: "/api/market/etf-flows",                desc: "ETF net inflow/outflow — SoSoValue, TTL 5min",              res: `{ "data": ETFFlowData[], "meta": { cachedAt, isStale } }` },
    { method: "GET",  path: "/api/market/sentiment",                desc: "AI news sentiment — SoSoValue, TTL 2min, ?limit=",          res: `{ "data": NewsSentiment[], "meta": { cachedAt, isStale } }` },
    { method: "GET",  path: "/api/market/etf-summary",              desc: "Aggregated ETF totals: net inflow, AUM, inflow/outflow count",res: `{ "data": { totalNetInflow, totalAUM, inflowCount, outflowCount, tickers, date }, "meta": { cachedAt, isStale } }` },
    { method: "GET",  path: "/api/market/overview",                 desc: "Prices + ETF + sentiment in one call",                      res: `{ "data": { markets, etf, sentiment }, "meta": { ... } }` },
    { method: "GET",  path: "/api/market/sodex/tickers",            desc: "Live SoDEX spot tickers (vBTC/vUSDC etc.)",                 res: `{ "data": SpotTicker[] }` },
    { method: "GET",  path: "/api/market/sodex/symbols",            desc: "SoDEX market symbol list, TTL 10min",                       res: `{ "data": SodexSymbol[] }` },
    { method: "GET",  path: "/api/market/sodex/orderbook/:symbol",  desc: "SoDEX orderbook for a symbol, ?limit=20",                   res: `{ "data": { bids, asks } }` },
    { method: "GET",  path: "/api/market/account/:address/state",   desc: "Real-time SoDEX account balances + open orders count",      res: `{ "data": { accountID, balances, openOrdersCount } }` },
    { method: "GET",  path: "/api/market/account/:address/orders/history", desc: "SoDEX order history for address, ?symbol, ?limit", res: `{ "data": Order[] }` },
    { method: "GET",  path: "/api/market/account/:address/trades",  desc: "SoDEX trade history for address, ?symbol, ?limit",         res: `{ "data": Trade[] }` },
    { method: "GET",  path: "/api/market/klines/:symbol",           desc: "OHLCV klines from SoDEX — ?interval=15m|1h|4h|1d&limit=96", res: `{ "data": { time, open, high, low, close, volume }[] }` },
    { method: "GET",  path: "/api/market/defi-tvl",                 desc: "Top 20 DeFi protocols by TVL — DefiLlama, TTL 5min",       res: `{ "data": { name, tvl, change_1d, category, logo }[] }` },
    { method: "GET",  path: "/api/market/heatmap",                  desc: "Market caps + 24h changes for top assets, TTL 3min",       res: `{ "data": { symbol, name, marketCap, change24h, price }[] }` },
    { method: "GET",  path: "/api/market/etf-history",              desc: "30-day ETF flow history — SoSoValue summary-history",      res: `{ "data": { date, netInflow, cumulativeInflow, price }[] }` },
    { method: "GET",  path: "/api/market/fundraising/:symbol",      desc: "VC funding rounds — SoSoValue fundraising, TTL 30min",     res: `{ "data": { date, amount, investors, round, valuation }[] }` },
    { method: "GET",  path: "/api/market/perps/mark-prices",        desc: "SoDEX perps mark prices for all symbols",                  res: `{ "data": { symbol, markPrice, indexPrice, fundingRate }[] }` },
    { method: "GET",  path: "/api/market/perps/symbols",            desc: "SoDEX perps symbol list",                                  res: `{ "data": PerpSymbol[] }` },
    { method: "GET",  path: "/api/market/perps/:address/state",     desc: "SoDEX perps account state — balances, open positions, PnL",res: `{ "data": { balance, positions: Position[] } }` },
    { method: "POST", path: "/api/sentinel/check",                  desc: "Run Sentinel risk checks on a copy-trade intent",           res: `{ "data": SentinelReport }` },
    { method: "POST", path: "/api/broker/execute",                  desc: "Execute copy-trade after user confirmation — Sentinel + SoDEX orders",        res: `{ "data": CopyTradeResult, "simulated"?: boolean }` },
    { method: "GET",  path: "/api/copy-trade/performance",          desc: "Verified session trade stats from tradeStore",                               res: `{ "data": { totalTrades, totalNotional, ... } }` },
    { method: "GET",  path: "/api/copy-trade/audit",                desc: "Sentinel blocks + execution audit log",                                      res: `{ "data": AuditEntry[] }` },
    { method: "POST", path: "/api/copy-trade/execute",            desc: "Deprecated — returns 410 Gone; use POST /api/broker/execute",                 res: `{ "error": "Use POST /api/broker/execute" }` },
    { method: "GET",  path: "/api/mcp/tools",                       desc: "List all registered MCP tools",                            res: `{ "data": MCPTool[] }` },
    { method: "POST", path: "/api/mcp/execute",                     desc: "Execute a named MCP tool with input",                      res: `{ "data": any }` },
    { method: "WS",   path: "ws://[host]:4000/ws",                  desc: "WebSocket hub — ORDER_FILL, JOURNALIST_PUBLISHED, SENTINEL_TRIP", res: `{ type: string, payload: any, timestamp: string }` },
  ];

  const methodColor = (m: string) => ({
    GET:  "text-emerald-400 bg-emerald-900/20 border-emerald-800/30",
    POST: "text-blue-300 bg-blue-900/20 border-blue-800/30",
    WS:   "text-bloom-orange bg-bloom-orange-dim border-bloom-border-hover",
  }[m] ?? "text-bloom-text-muted bg-white/5 border-bloom-border");

  return (
    <div>
      <DocH1>API Reference</DocH1>
      <DocP>
        The Bloom AI API runs on <DocCode>http://localhost:4000</DocCode> (dev) or your deployed Railway/Render URL (production).
        All REST responses are wrapped in <DocCode>{"{ data: T }"}</DocCode>. Market endpoints include a <DocCode>meta</DocCode> field with <DocCode>cachedAt</DocCode> and <DocCode>isStale</DocCode> for cache transparency.
      </DocP>

      <DocH2><Activity size={18} className="text-bloom-orange" />Response Envelope</DocH2>
      <DocBlock>{`// Success
{ "data": T, "meta"?: { "cachedAt": number, "isStale": boolean } }

// Error
{ "error": string, "statusCode": number }

// Cache metadata example (market endpoints):
{
  "data": [...],
  "meta": {
    "cachedAt": 1715123456789,   // Unix ms timestamp of last successful fetch
    "isStale": false             // true = serving cached data while re-fetching
  }
}`}</DocBlock>

      <DocH2><Code2 size={18} className="text-bloom-orange" />Endpoints</DocH2>
      <div className="space-y-2">
        {endpoints.map((ep) => (
          <details key={ep.path + ep.method} className="glass-card group">
            <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
              <span className={`text-xs font-bold px-2 py-0.5 rounded border font-mono ${methodColor(ep.method)}`}>{ep.method}</span>
              <code className="text-sm font-mono text-bloom-text flex-1">{ep.path}</code>
              <span className="text-xs text-bloom-text-muted hidden md:block">{ep.desc}</span>
              <ChevronRight size={14} className="text-bloom-text-muted group-open:rotate-90 transition-transform shrink-0" />
            </summary>
            <div className="px-4 pb-4 border-t border-bloom-border mt-2 pt-3">
              <p className="text-xs text-bloom-text-muted mb-2">{ep.desc}</p>
              <p className="text-xs text-bloom-text-muted mb-1 font-semibold">Response:</p>
              <DocBlock>{ep.res}</DocBlock>
            </div>
          </details>
        ))}
      </div>

      <DocH2><FileText size={18} className="text-bloom-orange" />SSE Event Format</DocH2>
      <DocBlock>{`// On connect — initial bulk load:
data: {"type":"INITIAL","data":[...SmartMoneyNewsletter[]]}

// Live updates:
data: {"type":"JOURNALIST_PUBLISHED","payload":{...SmartMoneyNewsletter}}

// JavaScript usage:
const es = new EventSource("http://localhost:4000/api/newsletters/stream");
es.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "INITIAL") setNewsletters(msg.data);
  if (msg.type === "JOURNALIST_PUBLISHED") prepend(msg.payload);
};`}</DocBlock>

      <DocH2><Globe size={18} className="text-bloom-orange" />WebSocket Events</DocH2>
      <DocBlock>{`// Connect:
const ws = new WebSocket("ws://localhost:4000/ws");

// Incoming events:
{ "type": "ORDER_SUBMITTED",       "payload": { intentId, symbol, allocationUSD } }
{ "type": "ORDER_FILL",            "payload": OrderFill, "simulated": boolean }
{ "type": "JOURNALIST_PUBLISHED",  "payload": SmartMoneyNewsletter }
{ "type": "NEWSLETTER_PUBLISHED",  "payload": SmartMoneyNewsletter }
{ "type": "SENTINEL_TRIP",         "payload": SentinelReport }
{ "type": "AGENT_STATUS",          "payload": { name, status, message } }`}</DocBlock>
    </div>
  );
}

// ── STRATEGIES ────────────────────────────────────────────────────────────────
function SectionStrategies() {
  return (
    <div>
      <DocH1>Strategies & SSI Protocol</DocH1>
      <DocP>
        Bloom AI strategies are on-chain Wrapped Token indices minted via the SSI Protocol on ValueChain L1.
        Each strategy is an <DocCode>SSIIndex</DocCode> object that defines a set of assets, their weights,
        current TVL, and rebalance history. The Strategist agent automatically generates new indices from
        newsletter narratives.
      </DocP>

      <DocH2><Layers size={18} className="text-bloom-orange" />SSIIndex Type</DocH2>
      <DocBlock>{`interface SSIIndex {
  id:           string;          // e.g. "ssi-mag7-003"
  name:         string;          // e.g. "BLOOM-MAG7"
  symbol:       string;          // e.g. "BLOOM-MAG7.ssi"
  description:  string;
  assets: {
    symbol:       string;        // e.g. "BTC"
    address:      string;        // EVM contract address
    weight:       number;        // 0–1, must sum to 1.0
    currentPrice: number;        // USD
  }[];
  tvl:          number;          // USD total value locked
  dailyFee:     number;          // e.g. 0.0001 = 0.01%/day
  createdAt:    string;          // ISO timestamp
  rebalancedAt: string;          // ISO timestamp
}`}</DocBlock>

      <DocH2><BarChart3 size={18} className="text-bloom-orange" />Pipeline-Generated Strategies</DocH2>
      <DocP>
        Strategies are created by the Strategist agent when you run <DocCode>POST /api/agents/pipeline/trigger</DocCode> or
        trigger a Journalist cycle. There is no static seed catalog — if the strategies page is empty, run the pipeline
        from the dashboard first. Each generated index includes live SoDEX prices in asset weights.
      </DocP>
      <InfoCard title="Empty state" icon={Layers}>
        <DocP>
          Before the first pipeline run, <DocCode>GET /api/strategies</DocCode> returns an empty array with a message
          explaining that indices are generated on demand. This is intentional for buildathon compliance — no fabricated TVL.
        </DocP>
      </InfoCard>

      <DocH2><Layers size={18} className="text-bloom-orange" />Example Generated Index</DocH2>
      {[
        { name: "BLOOM-MAG7", id: "ssi-mag7-*", assets: ["BTC 35%", "ETH 25%", "SOL 15%", "BNB 10%", "+3"], desc: "Risk-on narrative — top assets by ETF inflows and on-chain activity. Weights set by Strategist from live newsletter." },
      ].map((s) => (
        <InfoCard key={s.name} title={s.name} icon={Layers}>
          <p className="text-xs text-bloom-text-muted mb-2">{s.desc}</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {s.assets.map((a) => <Badge key={a} color="orange">{a}</Badge>)}
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-bloom-text-muted">ID: <DocCode>{s.id}</DocCode></span>
          </div>
        </InfoCard>
      ))}

      <DocH2><Lock size={18} className="text-bloom-orange" />Rebalancing</DocH2>
      <DocP>
        The Strategist agent triggers a rebalance whenever a new newsletter shifts the dominant narrative.
        Rebalances update the <DocCode>assets[].weight</DocCode> array and set <DocCode>rebalancedAt</DocCode> to the current timestamp.
        In Wave 2, this will call the SSI Protocol smart contract directly to execute an on-chain rebalance.
      </DocP>
    </div>
  );
}

// ── COPY TRADE ────────────────────────────────────────────────────────────────
function SectionCopyTrade() {
  return (
    <div>
      <DocH1>Copy Trade & SoDEX Integration</DocH1>
      <DocP>
        The copy-trade flow is a 4-step wizard that takes a user from wallet connection to on-chain order fills.
        Every trade flows through the Sentinel risk check before any order reaches SoDEX.
      </DocP>

      <DocH2><Zap size={18} className="text-bloom-orange" />4-Step Flow</DocH2>
      <div className="space-y-3 mb-6">
        {[
          { step: "1 — Connect Wallet", desc: "User connects via wagmi + MetaMask on ValueChain testnet (chainId 138565). Wallet address is required for Sentinel validation." },
          { step: "2 — Configure Trade", desc: "Select a pipeline-generated strategy, set USD allocation (default $100), configure max slippage in bps (default 50bps = 0.5%)." },
          { step: "3 — Sentinel Pre-flight", desc: "POST /api/sentinel/check runs 8 deterministic rules. If any fail, trade is blocked with an explanation." },
          { step: "4 — Execute on SoDEX", desc: "POST /api/broker/execute after explicit user confirmation. Returns OrderFill[] with simulated flag when credentials are missing." },
        ].map((s) => (
          <div key={s.step} className="glass-card p-4">
            <p className="text-sm font-semibold text-bloom-orange mb-1">{s.step}</p>
            <p className="text-xs text-bloom-text-muted">{s.desc}</p>
          </div>
        ))}
      </div>

      <DocH2><Code2 size={18} className="text-bloom-orange" />CopyTradeIntent Type</DocH2>
      <DocBlock>{`interface CopyTradeIntent {
  walletAddress: string;   // EVM address
  strategyId:    string;   // e.g. "ssi-mag7-003"
  allocation:    number;   // USD amount to deploy
  slippageBps:   number;   // max slippage in basis points (1bps = 0.01%)
}`}</DocBlock>

      <DocH2><Activity size={18} className="text-bloom-orange" />EIP-712 Order Format</DocH2>
      <DocP>SoDEX requires strict EIP-712 typed data. The Broker serializes all numeric fields as strings (DecimalString spec):</DocP>
      <DocBlock>{`// Domain
{
  name: "SoDEX", version: "1",
  chainId: 138565,            // testnet (mainnet: 286623)
  verifyingContract: "0x..."
}

// Per-asset order
{
  clOrdID:        "nano-id",  // unique client order ID
  symbol:         "BTC-USDT",
  side:           "Buy",
  orderType:      "Market",
  orderQtyDec:    "0.001",    // DecimalString — NOT a number
  priceTypeDec:   "0",
  timeInForce:    "GoodTillCancel",
  expireTimeSec:  "0"
}`}</DocBlock>
    </div>
  );
}

// ── SENTINEL ──────────────────────────────────────────────────────────────────
function SectionSentinel() {
  return (
    <div>
      <DocH1>Sentinel Risk Guard</DocH1>
      <DocP>
        The Sentinel is a hardcoded, non-AI circuit breaker. It is intentionally deterministic — no LLM,
        no probabilistic decisions. Every rule is a simple boolean check. This makes the Sentinel auditable,
        predictable, and safe to operate in a production environment.
      </DocP>

      <DocH2><Shield size={18} className="text-bloom-orange" />The 8 Rules</DocH2>
      <div className="space-y-2 mb-6">
        {[
          { id: "MAX_ORDER_USD",        rule: "allocationUSD ≤ $1,000",         desc: "Hard cap per single order. Prevents accidental fat-finger positions." },
          { id: "MAX_SLIPPAGE_BPS",     rule: "maxSlippageBps ≤ 100bps",        desc: "Maximum 1% slippage tolerance. Protects against thin-liquidity front-running." },
          { id: "MAX_DAILY_USD",        rule: "dailySpend + order ≤ $5,000",    desc: "Per-user daily exposure limit. Resets at UTC midnight. Backed by in-memory Map (Redis in production)." },
          { id: "POSITIVE_ALLOCATION",  rule: "allocationUSD > 0",              desc: "Allocation must be a positive number. Prevents zero-value phantom orders." },
          { id: "VALID_USER_ADDRESS",   rule: "/^0x[0-9a-fA-F]{40}$/.test(…)",  desc: "Wallet must be a valid EVM address (0x prefix + 40 hex chars)." },
          { id: "VALID_STRATEGY_ID",    rule: "strategyId.length > 0",          desc: "Strategy ID must be non-empty. Prevents routing to undefined indices." },
          { id: "ATR_VOLATILITY_FILTER",rule: "maxSlippageBps ≤ 1500bps",       desc: "ATR proxy check — if the user requests >15% slippage tolerance, the environment is high-volatility. Trade blocked until conditions normalise." },
          { id: "CIRCUIT_BREAKER",      rule: "lossStreak < 3",                 desc: "Consecutive-loss circuit breaker. After 3 successive trade losses, all further trades from that address are blocked pending manual review. Streak resets on a clean Sentinel pass." },
        ].map((r) => (
          <div key={r.id} className="glass-card p-4 flex gap-4">
            <div className="shrink-0">
              <CheckCircle size={16} className="text-emerald-400 mt-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DocCode>{r.id}</DocCode>
                <code className="text-xs text-bloom-text-muted font-mono">{r.rule}</code>
              </div>
              <p className="text-xs text-bloom-text-muted">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <DocH2><FileText size={18} className="text-bloom-orange" />SentinelReport Type</DocH2>
      <DocBlock>{`interface SentinelReport {
  intentId:  string;
  passed:    boolean;
  checks: {
    rule:    string;
    passed:  boolean;
    actual:  number | string;
    limit:   number | string;
    message?: string;          // only set when passed = false
  }[];
  timestamp: string;
}`}</DocBlock>

      <InfoCard title="Design Philosophy" icon={Shield}>
        <DocP>
          AI agents are powerful but non-deterministic. The Sentinel exists precisely because risk guardrails
          should never be probabilistic. A circuit breaker that "usually" catches dangerous trades is not a
          circuit breaker. The 8 rules are hardcoded constants — if you want to change a limit, you change
          the code, commit, and deploy. This creates an audit trail.
        </DocP>
      </InfoCard>
    </div>
  );
}

// ── MCP ───────────────────────────────────────────────────────────────────────
function SectionMCP() {
  return (
    <div>
      <DocH1>MCP Tool Registry</DocH1>
      <div className="pill-badge-orange mb-4 w-fit"><span className="live-dot" />Live · Claude · Cursor · VS Code</div>
      <DocP>
        Bloom AI ships a full <strong>Model Context Protocol (MCP)</strong> server at{" "}
        <DocCode>apps/api/src/mcp/server.ts</DocCode>. The 7 registered tools expose every
        SoSoValue and SoDEX data source as a structured, callable function for any MCP-compatible
        AI client — including Claude Desktop, Cursor, and VS Code Copilot Agent mode. Tools are
        discoverable via <DocCode>GET /api/mcp/tools</DocCode> and executable via{" "}
        <DocCode>POST /api/mcp/execute</DocCode>.
      </DocP>

      <DocH2><Globe size={18} className="text-bloom-orange" />SoSoValue Endpoints Used</DocH2>
      <DocP>
        Bloom AI integrates the SoSoValue Terminal API across <strong>19 endpoint calls</strong> covering
        8 data modules. Each module has an independent TTL cache to minimise API usage while keeping
        data fresh.
      </DocP>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-bloom-text-muted uppercase tracking-wider border-b border-bloom-border">
              <th className="pb-2 text-left font-semibold">Module</th>
              <th className="pb-2 text-left font-semibold">Endpoint(s)</th>
              <th className="pb-2 text-left font-semibold">Data</th>
              <th className="pb-2 text-right font-semibold">Cache TTL</th>
            </tr>
          </thead>
          <tbody>
            {[
              { module: "ETF Flows",       endpoints: "etf/list/netInflow (×8 tickers)",    data: "IBIT, FBTC, BITB, GBTC, HODL, ETHA, FETH, ETHV net inflow/outflow", ttl: "5 min"  },
              { module: "ETF History",     endpoints: "etf/summary-history",                data: "30-day cumulative ETF net inflow history with price overlay",         ttl: "15 min" },
              { module: "ETF Summary",     endpoints: "etf/summary",                        data: "Aggregated AUM, total net inflow, inflow/outflow count",              ttl: "5 min"  },
              { module: "News Sentiment",  endpoints: "news/sentiment",                     data: "AI-scored news articles with bullish/bearish signals per asset",      ttl: "2 min"  },
              { module: "Market Snapshots",endpoints: "market/snapshots",                   data: "Price, volume, market cap for BTC, ETH, SOL, BNB, AVAX",             ttl: "15 s"   },
              { module: "Klines (OHLCV)",  endpoints: "market/klines/:symbol (×5 symbols)", data: "Candlestick data for BTC, ETH, SOL, BNB, AVAX · 15m/1h/4h/1d",      ttl: "60 s"   },
              { module: "VC Funding",      endpoints: "fundraising/:symbol (×2)",            data: "Funding rounds, investors, amounts for BTC and ETH ecosystems",      ttl: "30 min" },
              { module: "Sector Indices",  endpoints: "market/category",                    data: "Sector-level momentum (DeFi, RWA, AI, GameFi, L2)",                  ttl: "10 min" },
            ].map((r) => (
              <tr key={r.module} className="border-b border-bloom-border/50 hover:bg-white/2 transition-colors">
                <td className="py-2.5 font-semibold text-bloom-orange whitespace-nowrap">{r.module}</td>
                <td className="py-2.5"><code className="text-bloom-text-muted font-mono">{r.endpoints}</code></td>
                <td className="py-2.5 text-bloom-text-muted max-w-[260px]">{r.data}</td>
                <td className="py-2.5 text-right"><span className="px-2 py-0.5 rounded border border-bloom-border text-bloom-text-muted font-mono">{r.ttl}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocH2><Globe size={18} className="text-bloom-orange" />Registered MCP Tools</DocH2>
      <div className="space-y-2 mb-6">
        {[
          { name: "get_etf_flows",        desc: "Fetch ETF net inflow/outflow data from SoSoValue Terminal API",       input: "{ limit?: number }" },
          { name: "get_news_sentiment",   desc: "Get AI-analysed news sentiment scores for crypto assets",             input: "{ asset?: string }" },
          { name: "get_market_snapshots", desc: "Current price, volume, and market cap snapshots for tracked assets",  input: "{}" },
          { name: "get_crypto_news",      desc: "Latest crypto news headlines from CryptoPanic",                      input: "{ limit?: number }" },
          { name: "get_defi_tvl",         desc: "DeFi protocol TVL rankings from DefiLlama",                          input: "{ limit?: number }" },
          { name: "get_sodex_tickers",    desc: "Live trading pair tickers from SoDEX orderbook",                     input: "{}" },
          { name: "get_sodex_orderbook",  desc: "Full orderbook depth for a specified trading pair",                   input: "{ symbol: string }" },
        ].map((t) => (
          <details key={t.name} className="glass-card group">
            <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
              <Cpu size={13} className="text-bloom-orange shrink-0" />
              <code className="text-sm font-mono text-bloom-orange flex-1">{t.name}</code>
              <span className="text-xs text-bloom-text-muted hidden md:block">{t.desc}</span>
              <ChevronRight size={14} className="text-bloom-text-muted group-open:rotate-90 transition-transform shrink-0" />
            </summary>
            <div className="px-4 pb-4 border-t border-bloom-border mt-2 pt-3">
              <p className="text-xs text-bloom-text-muted mb-2">{t.desc}</p>
              <p className="text-xs text-bloom-text-muted mb-1 font-semibold">Input schema:</p>
              <DocBlock>{t.input}</DocBlock>
            </div>
          </details>
        ))}
      </div>

      <DocH2><Code2 size={18} className="text-bloom-orange" />HTTP API Usage</DocH2>
      <DocBlock>{`// List all tools
GET /api/mcp/tools
→ { "data": [{ "name": string, "description": string, "inputSchema": object }] }

// Execute a tool
POST /api/mcp/execute
{ "tool": "get_etf_flows", "input": { "limit": 5 } }
→ { "data": ETFFlow[] }`}</DocBlock>

      <DocH2><Cpu size={18} className="text-bloom-orange" />Connect from Claude Desktop / Cursor / VS Code</DocH2>
      <DocP>
        Any MCP-compatible client can connect to Bloom AI's tool registry. The server exposes a standard
        JSON-RPC 2.0 interface over HTTP. Add the following to your client configuration:
      </DocP>
      <DocBlock>{`// Claude Desktop — claude_desktop_config.json
{
  "mcpServers": {
    "bloom-ai": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"],
      "env": {
        "MCP_SERVER_URL": "https://bloom-ai-mqrb.onrender.com/api/mcp"
      }
    }
  }
}

// Cursor / VS Code — settings.json
{
  "mcp.servers": {
    "bloom-ai": {
      "url": "https://bloom-ai-mqrb.onrender.com/api/mcp",
      "transport": "http"
    }
  }
}`}</DocBlock>

      <InfoCard title="Why MCP?" icon={Globe}>
        <DocP>
          MCP is rapidly becoming the standard for giving AI models access to live data and actions.
          By wrapping all SoSoValue and SoDEX integrations as MCP tools, Bloom AI lets any compatible
          AI assistant — Claude, GPT-4o, Gemini, or a custom agent — query live crypto market data
          and execute copy trades through a single, auditable interface.
        </DocP>
      </InfoCard>
    </div>
  );
}

// ── ROADMAP ───────────────────────────────────────────────────────────────────
function SectionRoadmap() {
  return (
    <div>
      <div className="pill-badge-orange mb-4 w-fit"><span className="live-dot" />Active Development</div>
      <DocH1>Roadmap</DocH1>
      <DocP>
        Bloom AI is being built across three waves for the SoSoValue Buildathon 2026.
        Wave 1 and Wave 2 (buildathon hardening) are complete. Wave 3 covers mainnet and ecosystem expansion.
      </DocP>

      {[
        {
          wave: "Wave 1",
          title: "Demo-Ready Foundation",
          subtitle: "Complete",
          status: "complete" as const,
          date: "May 2026",
          color: "emerald",
          items: [
            { done: true,  text: "Monorepo scaffolding (Next.js 15 + Fastify 4 + shared types)" },
            { done: true,  text: "Five-agent pipeline with WebSocket hub + SSE newsletter stream" },
            { done: true,  text: "Dashboard, Terminal, Research, Strategies, Copy Trade, Performance pages" },
            { done: true,  text: "Journalist — SoSoValue polling + OpenRouter LLM" },
            { done: true,  text: "Chart Analyst — SoDEX klines, RSI/SMA, TA briefing" },
            { done: true,  text: "Strategist — narrative → SSI portfolio weights" },
            { done: true,  text: "Broker — EIP-712 signed SoDEX orders" },
            { done: true,  text: "Sentinel — 8-rule deterministic circuit breaker" },
            { done: true,  text: "MCP tool registry (7 tools)" },
            { done: true,  text: "wagmi wallet connect on ValueChain testnet" },
            { done: true,  text: "Docs page with full API reference and roadmap" },
          ],
        },
        {
          wave: "Wave 2",
          title: "Buildathon Hardening & Live Integration",
          subtitle: "Complete",
          status: "complete" as const,
          date: "Jun 2026",
          color: "emerald",
          items: [
            { done: true,  text: "SoDEX API parsing fix — lastPx, object klines, time normalization" },
            { done: true,  text: "POST /api/agents/pipeline/trigger — full orchestrated pipeline" },
            { done: true,  text: "Removed static strategy catalog and fabricated performance metrics" },
            { done: true,  text: "Live SoSoValue + SoDEX health probes on /health" },
            { done: true,  text: "Chart Analyst trigger returns newsletter content to Signals tab" },
            { done: true,  text: "Price meta.source — explicit sodex/coingecko/seed labeling" },
            { done: true,  text: "AgentStatusBar polls live pipeline progress" },
            { done: true,  text: "Smoke tests + DEMO.md verification checklist" },
            { done: true,  text: "Copy-trade audit trail + verified session performance" },
            { done: false, text: "SSI Protocol on-chain index minting via SoSoValue Index API" },
            { done: false, text: "Real nonce management for production EIP-712 signing" },
            { done: false, text: "Sentinel daily exposure reset (UTC midnight cron)" },
          ],
        },
        {
          wave: "Wave 3",
          title: "Mainnet & Ecosystem Expansion",
          subtitle: "Planned",
          status: "planned" as const,
          date: "Q4 2026",
          color: "blue",
          items: [
            { done: false, text: "SoDEX Mainnet deployment (chainId 286623) with real assets" },
            { done: false, text: "Opportunity Discovery Engine — ETF + sentiment + TA scoring" },
            { done: false, text: "Verified Signal Ledger — evidence → thesis → execution → outcome" },
            { done: false, text: "On-chain strategy marketplace — permissionless index creation" },
            { done: false, text: "Social layer — follow strategists, copy their indices" },
            { done: false, text: "Perpetual futures support on SoDEX" },
            { done: false, text: "DAO governance for Sentinel rule changes" },
            { done: false, text: "Mobile app (React Native)" },
            { done: false, text: "Institutional API tier — dedicated endpoints, higher rate limits" },
            { done: false, text: "Automated audit trails — all Sentinel decisions on-chain" },
          ],
        },
      ].map((wave) => {
        const statusClasses = {
          complete: { badge: "bg-emerald-900/30 border-emerald-800/40 text-emerald-400", dot: "bg-emerald-400", line: "bg-emerald-400/40" },
          active:   { badge: "bg-bloom-orange-dim border-bloom-border-hover text-bloom-orange", dot: "bg-bloom-orange animate-pulse", line: "bg-bloom-orange/30" },
          planned:  { badge: "bg-white/5 border-bloom-border text-bloom-text-muted", dot: "bg-bloom-text-muted/30", line: "bg-white/10" },
        }[wave.status];

        return (
          <div key={wave.wave} className="mb-10">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                <div className={`w-3 h-3 rounded-full ${statusClasses.dot}`} />
                <div className={`w-0.5 flex-1 min-h-[200px] ${statusClasses.line}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusClasses.badge}`}>
                    {wave.status === "complete" ? "✓ Complete" : "◎ Planned"}
                  </span>
                  <span className="text-xs text-bloom-text-muted">{wave.date}</span>
                </div>
                <h2 className="text-xl font-bold text-bloom-text mb-0.5">{wave.wave} — {wave.title}</h2>
                <p className="text-sm text-bloom-text-muted mb-4">{wave.subtitle}</p>

                <div className="glass-card p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6">
                    {wave.items.map((item) => (
                      <div key={item.text} className="flex items-start gap-2 text-xs">
                        {item.done ? (
                          <CheckCircle size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : wave.status === "complete" ? (
                          <Clock size={13} className="text-bloom-orange shrink-0 mt-0.5" />
                        ) : (
                          <Circle size={13} className="text-bloom-text-muted/40 shrink-0 mt-0.5" />
                        )}
                        <span className={item.done ? "text-bloom-text" : "text-bloom-text-muted"}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="glass-card border-bloom-border-hover p-8 text-center shadow-orange-glow-lg mt-4">
        <div className="pill-badge-orange mx-auto mb-4 w-fit">
          <span className="live-dot" />
          SoSoValue Buildathon 2026
        </div>
        <h3 className="text-2xl font-bold text-bloom-text mb-2">
          Built to <span className="orange-gradient-text">Win</span>
        </h3>
        <p className="text-bloom-text-muted text-sm max-w-lg mx-auto mb-6">
          Bloom AI is a full-stack, production-architecture demo that integrates every SoSoValue product layer —
          Terminal API, SSI Protocol, and SoDEX — into a single agentic system.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="orange-btn flex items-center justify-center gap-2 px-8 py-2.5 text-sm">
            Open Terminal <ArrowUpRight size={14} />
          </Link>
          <Link href="/copy-trade" className="orange-btn-outline flex items-center justify-center gap-2 px-8 py-2.5 text-sm">
            Try Copy Trade <Wallet size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
