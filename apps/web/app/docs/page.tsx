"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Brain, Layers, Zap, Shield, ChevronRight, BookOpen,
  Activity, Globe, Lock, ArrowUpRight, CheckCircle,
  Clock, Circle, Rocket, Code2, Cpu, FileText, BarChart3, Wallet,
  LineChart, TrendingUp, Bot,
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
  { id: "copy-trade",     label: "Trade & Auto-Copy",   icon: Zap        },
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
              Live fills · Auto-Copy
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
      <div className="pill-badge-orange mb-4 w-fit"><span className="live-dot" />Live SoDEX fills · Auto-Copy ready</div>
      <DocH1>Bloom AI — Research to Live SoDEX Fills</DocH1>
      <DocP>
        Bloom AI is an agentic research-to-execution stack on the SoSoValue ecosystem. Five agents turn ETF flows,
        sentiment, and SoDEX market data into Smart Money newsletters and pipeline-minted SSI baskets. You review
        strategies, then trade manually with MetaMask — or sign one Auto-Copy grant so Sentinel-gated fills run after
        the next pipeline. Performance shows verified fills only: equity curve, by-asset / by-strategy PnL, and
        Auto-Copy vs manual attribution. No fabricated TVL or win rates.
      </DocP>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {[
          { icon: Brain,     title: "5-Agent Pipeline",         desc: "Journalist → Chart Analyst → Strategist → Sentinel → Broker. Run from Home; strategies stay empty until the pipeline mints them." },
          { icon: Layers,    title: "SSI Strategies",           desc: "Pipeline-generated baskets with Review → Trade, SoSo index compare, and Studio weight edits — ledger-backed signal trail." },
          { icon: Bot,       title: "Trade & Auto-Copy",        desc: "Manual EIP-712 batchNewOrder fills on SoDEX testnet, or one AutoCopyGrant signature for unattended copies within your limits." },
          { icon: BarChart3, title: "MTM Performance",          desc: "Verified session analytics — equity curve, by asset / strategy / day, Auto-Copy tags, mark-to-market from SoDEX prices." },
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

      <DocH2><BookOpen size={18} className="text-bloom-orange" />Product Journey</DocH2>
      <DocP>
        The app follows one path: <DocCode>Home</DocCode> → <DocCode>Discover</DocCode> → <DocCode>News</DocCode> →{" "}
        <DocCode>Strategies</DocCode> → <DocCode>Trade</DocCode> → <DocCode>Results</DocCode>.
      </DocP>

      <DocH2><BookOpen size={18} className="text-bloom-orange" />Quick Start</DocH2>
      <DocP>Clone the monorepo, install deps, configure environment variables, and run both servers:</DocP>
      <DocBlock>{`# 1. Install all workspace deps
npm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
# Required for live fills: SOSOVALUE_API_KEY, SODEX_API_PRIVATE_KEY, OPENROUTER_API_KEY
# Optional: SODEX_API_KEY_NAME (omit for master key)

# 3. Start the API server (port 4000)
cd apps/api && npx tsx src/index.ts

# 4. Start the frontend (port 3000)
cd apps/web && npx next dev --port 3000`}</DocBlock>

      <DocH2><Globe size={18} className="text-bloom-orange" />Pages</DocH2>
      <div className="space-y-2">
        {[
          { path: "/",            desc: "Landing — live fills, Auto-Copy, journey, agent + integration stack" },
          { path: "/dashboard",   desc: "Home — run pipeline, live prices, guided next steps" },
          { path: "/research",    desc: "Discover — charts, L2 book, signals, confluence, opportunities" },
          { path: "/terminal",    desc: "News — Smart Money newsletters + market context side panels" },
          { path: "/strategies",  desc: "SSI baskets — Review → Trade, compare, Studio (empty until pipeline)" },
          { path: "/copy-trade",  desc: "Trade — manual MetaMask wizard + Auto-Copy grant panel" },
          { path: "/performance", desc: "Results — equity, by-asset / by-strategy MTM, Auto-Copy vs manual" },
          { path: "/roadmap",     desc: "Phases 1–4 — shipped Auto-Copy + analytics in Phase 2" },
          { path: "/docs",        desc: "This documentation page" },
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
│   │       │   ├── broker/      # EIP-712 batchNewOrder + SoDEX submission
│   │       │   └── sentinel/    # Deterministic risk gates (11+ rules)
│   │       ├── signing/
│   │       │   ├── eip712.ts       # DecimalString + yParity helpers
│   │       │   └── autoCopyAuth.ts # AutoCopyGrant EIP-712 verify
│   │       ├── store/
│   │       │   ├── tradeStore.ts     # Fills + MTM performance
│   │       │   ├── autoCopyStore.ts  # Grants + run history
│   │       │   └── strategyStore.ts  # Pipeline SSI indices
│   │       ├── routes/          # REST — market, agents, copy-trade, auto-copy, …
│   │       ├── services/
│   │       │   ├── sosovalue.ts # Terminal API (ETF, news, macro, …)
│   │       │   ├── sodex.ts     # Spot batch, tickers, account, cancel-only skip
│   │       │   └── autoCopy.ts  # Post-pipeline Auto-Copy runner
│   │       └── mcp/             # MCP tool registry (7 tools)
│   └── web/                     # Next.js 15 App Router (port 3000)
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
          { step: "0", title: "POST /api/agents/pipeline/trigger",        desc: "Home runs the full pipeline: Journalist → Chart Analyst → Strategist → Sentinel preview. Then Auto-Copy subscribers (if any) execute against the new strategy." },
          { step: "1", title: "Journalist polls every 10 min (TTL cached)", desc: "Fetches ETF flows, news sentiment, and market snapshots (SoDEX first, CoinGecko fallback) → LLM newsletter via OpenRouter (template fallback if key missing)." },
          { step: "2", title: "Chart Analyst runs on schedule or trigger", desc: "SoDEX klines → RSI/SMA → TA briefing. POST /api/agents/chartanalyst/trigger returns the newsletter for Discover Signals." },
          { step: "3", title: "Strategist mints SSI basket",              desc: "Narrative → live-weighted SSIIndex in strategyStore. Strategies page is empty until this runs." },
          { step: "4", title: "Trade: manual or Auto-Copy",               desc: "Manual: MetaMask → POST /api/broker/execute (batchNewOrder, cancel-only legs skipped). Auto-Copy: one AutoCopyGrant → fills after the next pipeline within grant limits." },
          { step: "5", title: "Verified Performance",                    desc: "tradeStore persists fills → GET /api/copy-trade/performance returns equity, byAsset, byStrategy, byDay, Auto-Copy counts, and live MTM marks." },
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
          { layer: "Blockchain",  tech: "EIP-712 batchNewOrder · AutoCopyGrant · ValueChain testnet 138565" },
          { layer: "AI / LLM",   tech: "OpenRouter · Journalist + Chart Analyst with deterministic fallbacks" },
          { layer: "Data",        tech: "SoSoValue Terminal · SoDEX · CoinGecko · CryptoPanic · DefiLlama" },
          { layer: "Persistence", tech: "JSON tradeStore + autoCopyStore (Postgres planned for multi-user)" },
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
          icon: Zap, name: "The Broker", role: "Live SoDEX Execution",
          color: "rgba(232,97,10,0.12)",
          desc: "The Broker places real spot batchNewOrder fills on SoDEX testnet. It resolves accountID from the funded SoDEX wallet, strips DecimalString trailing zeros, normalizes ECDSA yParity, skips cancel-only symbols (e.g. ETH on some testnet states), and renormalizes allocation onto tradable pairs. Manual trades go through POST /api/broker/execute; Auto-Copy runs the same path after pipeline strategy mint.",
          details: [
            { k: "Endpoint",    v: "POST /api/broker/execute" },
            { k: "Signing",     v: "EIP-712 batchNewOrder (DecimalString + yParity 0/1)" },
            { k: "Chain IDs",   v: "Testnet: 138565 · Mainnet: 286623" },
            { k: "Auto-Copy",   v: "triggerAutoCopyForStrategy after pipeline mint" },
            { k: "Output",      v: "OrderFill[] + simulated flag when credentials missing" },
          ],
          code: `// Spot batch must sign as batchNewOrder (not newOrder)
// DecimalString: strip trailing zeros · v → yParity 0|1
// Cancel-only legs skipped; allocation renormalized onto tradable pairs
const sig = await signTypedData(privateKey, domain, batchNewOrderTypes, batch);`,
        },
        {
          icon: Shield, name: "The Sentinel", role: "Deterministic Risk Guard",
          color: "rgba(245,160,32,0.10)",
          desc: "The Sentinel is a non-AI circuit breaker. Core rules always run (size, slippage, daily exposure, address, strategy, ATR proxy, loss streak, macro hard gate). Conditional rules cover perps leverage, mainnet confirmation, and TWAP. Any failure blocks the intent before Broker submits to SoDEX.",
          details: [
            { k: "Rules",       v: "11+ deterministic checks — see Sentinel Risk Guard section" },
            { k: "Endpoint",    v: "POST /api/sentinel/check" },
            { k: "Pipeline",    v: "Dry-run preview during POST /api/agents/pipeline/trigger" },
            { k: "Output",      v: "SentinelReport with per-rule pass/fail" },
          ],
          code: `// Always-on: MAX_ORDER_USD, MAX_SLIPPAGE_BPS, MAX_DAILY_USD,
// POSITIVE_ALLOCATION, VALID_USER_ADDRESS, VALID_STRATEGY_ID,
// ATR_VOLATILITY_FILTER, CIRCUIT_BREAKER, MACRO_EVENT_HARD_GATE
// Conditional: MAX_LEVERAGE, MAINNET_CONFIRMATION, TWAP_*`,
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
    { method: "POST", path: "/api/broker/execute",                  desc: "Execute copy-trade — Sentinel + SoDEX batchNewOrder fills", res: `{ "data": CopyTradeResult, "simulated"?: boolean }` },
    { method: "GET",  path: "/api/copy-trade/history",              desc: "Persisted trade log (newest first)",                       res: `{ "data": TradeRecord[] }` },
    { method: "GET",  path: "/api/copy-trade/performance",          desc: "Verified MTM analytics — equity, byAsset, byStrategy, Auto-Copy", res: `{ "data": { totalTrades, autoCopyTrades, byAsset, byStrategy, byDay, equityCurve, mtmUpdated, markCache } }` },
    { method: "GET",  path: "/api/copy-trade/audit",                desc: "Sentinel blocks + execution audit log",                    res: `{ "data": AuditEntry[] }` },
    { method: "POST", path: "/api/copy-trade/preview",              desc: "Sentinel check without executing",                         res: `{ "data": SentinelReport }` },
    { method: "POST", path: "/api/copy-trade/execute",              desc: "Deprecated — 410 Gone; use POST /api/broker/execute",      res: `{ "error": "Use POST /api/broker/execute" }` },
    { method: "POST", path: "/api/auto-copy/enable",                desc: "Enable Auto-Copy with verified EIP-712 AutoCopyGrant",     res: `{ "data": AutoCopySubscription, "message": string }` },
    { method: "POST", path: "/api/auto-copy/disable",               desc: "Disable Auto-Copy for a wallet",                           res: `{ "data": AutoCopySubscription, "message": string }` },
    { method: "GET",  path: "/api/auto-copy/:address",              desc: "Subscription + recent Auto-Copy runs",                     res: `{ "data": AutoCopySubscription | null, "runs": AutoCopyRun[] }` },
    { method: "GET",  path: "/api/auto-copy/:address/runs",         desc: "Full Auto-Copy run history",                               res: `{ "data": AutoCopyRun[] }` },
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
        The Bloom AI API runs on <DocCode>http://localhost:4000</DocCode> (dev) or{" "}
        <DocCode>https://bloom-ai-mqrb.onrender.com</DocCode> (production). All REST responses are wrapped in{" "}
        <DocCode>{"{ data: T }"}</DocCode>. Market endpoints include a <DocCode>meta</DocCode> field with{" "}
        <DocCode>cachedAt</DocCode> and <DocCode>isStale</DocCode> for cache transparency.
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
        Strategies are pipeline-minted <DocCode>SSIIndex</DocCode> baskets — off-chain today, designed for SSI Protocol
        on-chain minting on mainnet. Each index defines assets, weights, and rebalance history. On{" "}
        <DocCode>/strategies</DocCode> you Review a basket, Compare to SoSo indexes, edit weights in Studio, then
        hand off to Trade. There is no static seed catalog and no fabricated TVL.
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

      <DocH2><Lock size={18} className="text-bloom-orange" />Review → Trade</DocH2>
      <DocP>
        After the pipeline mints an index, open Strategies → Review to inspect weights and signal trail, then Trade
        to open the copy-trade wizard with that strategy pre-selected. Studio edits call{" "}
        <DocCode>PUT /api/strategies/:id</DocCode> / rebalance endpoints; Compare uses{" "}
        <DocCode>POST /api/strategies/compare</DocCode>.
      </DocP>
      <DocP>
        Off-chain rebalances update <DocCode>assets[].weight</DocCode> and <DocCode>rebalancedAt</DocCode>. On-chain
        SSI Protocol minting via SoSoValue Index API remains on the Phase 4 roadmap.
      </DocP>
    </div>
  );
}

// ── COPY TRADE ────────────────────────────────────────────────────────────────
function SectionCopyTrade() {
  return (
    <div>
      <DocH1>Trade & Auto-Copy</DocH1>
      <DocP>
        Two execution paths share the same Sentinel + Broker stack. Manual copy-trade is a 4-step MetaMask wizard.
        Auto-Copy is one EIP-712 grant — then new pipeline strategies fill within your limits without another click.
      </DocP>

      <DocH2><Zap size={18} className="text-bloom-orange" />Manual — 4-Step Flow</DocH2>
      <div className="space-y-3 mb-6">
        {[
          { step: "1 — Connect Wallet", desc: "wagmi + MetaMask on ValueChain testnet (chainId 138565). Broker may resolve accountID from the funded SoDEX wallet if it differs from MetaMask." },
          { step: "2 — Configure Trade", desc: "Select a pipeline-generated strategy, set USD allocation, max slippage (default 50bps)." },
          { step: "3 — Sentinel Pre-flight", desc: "POST /api/sentinel/check (or /api/copy-trade/preview). Any failed rule blocks the trade with an explanation." },
          { step: "4 — Execute on SoDEX", desc: "POST /api/broker/execute after confirmation. Spot batch signs as batchNewOrder; cancel-only legs are skipped. Returns OrderFill[] (simulated if credentials missing)." },
        ].map((s) => (
          <div key={s.step} className="glass-card p-4">
            <p className="text-sm font-semibold text-bloom-orange mb-1">{s.step}</p>
            <p className="text-xs text-bloom-text-muted">{s.desc}</p>
          </div>
        ))}
      </div>

      <DocH2><Bot size={18} className="text-bloom-orange" />Auto-Copy Grant</DocH2>
      <DocP>
        On Trade, enable Auto-Copy by signing an <DocCode>AutoCopyGrant</DocCode> (EIP-712). The grant stores
        max allocation, daily USD, slippage, venue, expiry, and nonce. After each successful pipeline strategy mint,
        the API runs Auto-Copy for active subscribers — each run still passes Sentinel before Broker execution.
      </DocP>
      <DocBlock>{`// POST /api/auto-copy/enable
{
  "userAddress": "0x…",
  "maxAllocationUSD": 100,
  "maxDailyUSD": 500,
  "maxSlippageBps": 50,
  "venue": "spot",
  "expiresAt": 1719000000,
  "nonce": 1,
  "signature": "0x…"   // EIP-712 AutoCopyGrant
}

// GET /api/auto-copy/:address → subscription + recent runs
// POST /api/auto-copy/disable  { "userAddress": "0x…" }`}</DocBlock>

      <DocH2><Code2 size={18} className="text-bloom-orange" />CopyTradeIntent Type</DocH2>
      <DocBlock>{`interface CopyTradeIntent {
  userAddress:    string;   // EVM address
  strategyId:     string;   // e.g. "ssi-mag7-003"
  allocationUSD:  number;   // USD amount to deploy
  maxSlippageBps: number;   // max slippage in basis points
  venue?:         "spot" | "perps";
  // optional: leverage, executionStyle, twapDurationSec, userSignature
}`}</DocBlock>

      <DocH2><Activity size={18} className="text-bloom-orange" />EIP-712 / SoDEX Signing Notes</DocH2>
      <DocP>
        Spot batches must use the <DocCode>batchNewOrder</DocCode> type (not <DocCode>newOrder</DocCode>). Numeric
        fields are DecimalStrings with trailing zeros stripped. ECDSA <DocCode>v</DocCode> is normalized to yParity
        0/1. Symbols in cancel-only mode are skipped and allocation renormalized.
      </DocP>
      <DocBlock>{`// Domain — ValueChain testnet
{ name: "SoDEX", version: "1", chainId: 138565, verifyingContract: "0x…" }

// Live fills require SODEX_API_PRIVATE_KEY on the API.
// Master keys typically omit X-API-Key; named keys set SODEX_API_KEY_NAME.`}</DocBlock>

      <DocH2><BarChart3 size={18} className="text-bloom-orange" />Performance</DocH2>
      <DocP>
        <DocCode>GET /api/copy-trade/performance</DocCode> returns verified session stats only — total trades,
        Auto-Copy count, byAsset / byStrategy / byDay breakdowns, equityCurve, and live mark-to-market updates.
        The Performance page never invents win rates or PnL.
      </DocP>
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

      <DocH2><Shield size={18} className="text-bloom-orange" />Always-On Rules</DocH2>
      <div className="space-y-2 mb-6">
        {[
          { id: "MAX_ORDER_USD",         rule: "allocationUSD ≤ SENTINEL_MAX_ORDER_USD", desc: "Hard cap per single order. Prevents accidental fat-finger positions." },
          { id: "MAX_SLIPPAGE_BPS",      rule: "maxSlippageBps ≤ SENTINEL_MAX_SLIPPAGE_BPS", desc: "Caps slippage tolerance against thin-liquidity / front-running risk." },
          { id: "MAX_DAILY_USD",         rule: "dailySpend + order ≤ SENTINEL_MAX_DAILY_USD", desc: "Per-user daily exposure limit. In-memory Map today; Redis/Postgres planned." },
          { id: "POSITIVE_ALLOCATION",   rule: "allocationUSD > 0",              desc: "Allocation must be a positive number." },
          { id: "VALID_USER_ADDRESS",    rule: "/^0x[0-9a-fA-F]{40}$/",          desc: "Wallet must be a valid EVM address." },
          { id: "VALID_STRATEGY_ID",     rule: "strategyId.length > 0",          desc: "Strategy ID must be non-empty." },
          { id: "ATR_VOLATILITY_FILTER", rule: "maxSlippageBps ≤ ATR threshold", desc: "High slippage tolerance is treated as a high-volatility regime proxy — trade blocked." },
          { id: "CIRCUIT_BREAKER",       rule: "lossStreak < max consecutive",   desc: "After N successive losses, further trades from that address are blocked until reset." },
          { id: "MACRO_EVENT_HARD_GATE", rule: "no high-importance event ±Nh",   desc: "SoSoValue macro calendar hard gate — blocks near high-importance events." },
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

      <DocH2><Shield size={18} className="text-bloom-orange" />Conditional Rules</DocH2>
      <div className="space-y-2 mb-6">
        {[
          { id: "MAX_LEVERAGE",          rule: "leverage ≤ SENTINEL_MAX_LEVERAGE", desc: "Perps venue only — also requires SODEX_ENABLE_PERPS_COPY." },
          { id: "MAINNET_CONFIRMATION",  rule: "userSignature present",           desc: "Mainnet network only — requires wallet EIP-712 confirmation." },
          { id: "TWAP_ENABLED",          rule: "SODEX_ENABLE_TWAP=1",              desc: "When executionStyle is twap." },
          { id: "TWAP_DURATION",         rule: "60–86400 seconds",                 desc: "TWAP duration bounds when twap is selected." },
        ].map((r) => (
          <div key={r.id} className="glass-card p-4 flex gap-4">
            <div className="shrink-0">
              <Clock size={16} className="text-bloom-orange mt-0.5" />
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
          AI agents are powerful but non-deterministic. The Sentinel exists because risk guardrails should never
          be probabilistic. Limits are env-backed constants — change them in config, commit, and deploy. Manual
          trades and Auto-Copy both pass through the same gate before Broker can fire.
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
        Bloom AI ships for the SoSoValue Buildathon 2026 across four phases. Phases 1–2 are complete (including
        live SoDEX fills, Auto-Copy, and MTM analytics). Phase 3 deepens intelligence; Phase 4 is mainnet.
      </DocP>

      {[
        {
          wave: "Phase 1",
          title: "Foundation & Agent Pipeline",
          subtitle: "Complete",
          status: "complete" as const,
          date: "2026",
          color: "emerald",
          items: [
            { done: true,  text: "Monorepo — Next.js 15 + Fastify 4 + shared types" },
            { done: true,  text: "Five-agent pipeline with WebSocket hub + SSE" },
            { done: true,  text: "Home / Discover / News / Strategies / Trade / Performance" },
            { done: true,  text: "Journalist, Chart Analyst, Strategist, Sentinel, Broker" },
            { done: true,  text: "EIP-712 copy-trade on ValueChain testnet (138565)" },
            { done: true,  text: "MCP tool registry (7 tools)" },
            { done: true,  text: "Docs + DEMO.md verification checklist" },
          ],
        },
        {
          wave: "Phase 2",
          title: "Live Production Hardening",
          subtitle: "Complete",
          status: "complete" as const,
          date: "2026",
          color: "emerald",
          items: [
            { done: true,  text: "Pipeline-only SSI strategies — no static seed catalog" },
            { done: true,  text: "SoDEX signing — DecimalString, yParity, batchNewOrder, cancel-only skip" },
            { done: true,  text: "Auto-Copy grants — one signature, fills after next pipeline" },
            { done: true,  text: "Performance — equity, by-asset / by-strategy, Auto-Copy vs manual" },
            { done: true,  text: "Guided journey + Sentinel macro hard gate" },
            { done: true,  text: "Live health probes + audit trail" },
            { done: false, text: "Postgres persistence for trades / Auto-Copy across redeploys" },
          ],
        },
        {
          wave: "Phase 3",
          title: "Intelligence & Discovery",
          subtitle: "In Progress",
          status: "active" as const,
          date: "2026",
          color: "orange",
          items: [
            { done: true,  text: "Opportunity Discovery + Verified Signal Ledger (shipped surfaces)" },
            { done: true,  text: "Index Publisher Studio + confluence signals" },
            { done: false, text: "Deeper Auto-Copy attribution and social copy profiles" },
            { done: false, text: "Richer alert system — RSI, ETF spikes, opportunity scores" },
          ],
        },
        {
          wave: "Phase 4",
          title: "Mainnet & Ecosystem",
          subtitle: "Planned",
          status: "planned" as const,
          date: "Q4 2026",
          color: "blue",
          items: [
            { done: false, text: "SoDEX Mainnet (chainId 286623) with real assets" },
            { done: false, text: "SSI Protocol on-chain index minting" },
            { done: false, text: "Social copy profiles + subscriber leaderboard" },
            { done: false, text: "Perps copy-trade with leverage caps" },
            { done: false, text: "DAO governance for Sentinel rule changes" },
          ],
        },
      ].map((wave) => {
        const statusClasses = {
          complete: { badge: "bg-emerald-900/30 border-emerald-800/40 text-emerald-400", dot: "bg-emerald-400", line: "bg-emerald-400/40" },
          active:   { badge: "bg-bloom-orange-dim border-bloom-border-hover text-bloom-orange", dot: "bg-bloom-orange animate-pulse", line: "bg-bloom-orange/30" },
          planned:  { badge: "bg-white/5 border-bloom-border text-bloom-text-muted", dot: "bg-bloom-text-muted/30", line: "bg-white/10" },
        }[wave.status];

        const statusText =
          wave.status === "complete" ? "✓ Complete" : wave.status === "active" ? "● In Progress" : "◎ Planned";

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
                    {statusText}
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
          Full-stack research-to-execution on SoSoValue — Terminal API, SSI baskets, and live SoDEX fills with
          Auto-Copy and verified MTM analytics.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="orange-btn flex items-center justify-center gap-2 px-8 py-2.5 text-sm">
            Open App <ArrowUpRight size={14} />
          </Link>
          <Link href="/copy-trade" className="orange-btn-outline flex items-center justify-center gap-2 px-8 py-2.5 text-sm">
            Trade & Auto-Copy <Wallet size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
