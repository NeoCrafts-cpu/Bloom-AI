"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRef } from "react";
import {
  ArrowUpRight, Zap, Shield, TrendingUp, Brain, Layers,
  ChevronRight, Activity, Globe, Lock, LineChart, BarChart3,
  BookOpen, Newspaper, Copy, Search,
} from "lucide-react";
import dynamic from "next/dynamic";
import LandingNavbar from "@/components/LandingNavbar";
import AnimatedCounter from "@/components/AnimatedCounter";
import { RevealStagger, RevealItem } from "@/components/Reveal";
import WelcomeModal from "@/components/WelcomeModal";

const BloomVisualization = dynamic(() => import("@/components/BloomVisualization"), { ssr: false });
const PixelBackground    = dynamic(() => import("@/components/PixelBackground"),    { ssr: false });

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function HomePage() {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <main className="relative min-h-screen overflow-hidden bg-bloom-bg">
      <WelcomeModal />

      {/* ── Animated background ── */}
      <PixelBackground />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {/* Orb 1 — top-left */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.07, 0.12, 0.07] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, #E8610A 0%, transparent 70%)" }}
        />
        {/* Orb 2 — bottom-right */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.09, 0.05] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, #F5A020 0%, transparent 70%)" }}
        />
        {/* Orb 3 — center */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
          style={{ background: "radial-gradient(circle, #E8610A 0%, transparent 65%)" }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-64"
          style={{ background: "linear-gradient(to top, #0A0703 0%, transparent 100%)" }}
        />
      </div>

      <div className="relative" style={{ zIndex: 10 }}>
        <LandingNavbar />

        {/* ── HERO ── */}
        <section
          ref={heroRef}
          className="min-h-screen flex flex-col lg:flex-row items-center justify-center gap-8 px-6 pt-24 pb-12 max-w-7xl mx-auto"
        >
          {/* ─ Left: text ─ */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.1, ease }}
              className="pill-badge-orange mb-7"
            >
              <span className="live-dot" />
              LIVE ON SODEX TESTNET · SOSOVALUE BUILDATHON 2026
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.25, ease }}
              className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
            >
              <span className="text-bloom-text">The Agentic</span>
              <br />
              <span className="orange-gradient-text">Finance OS</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.4, ease }}
              className="text-bloom-text-muted text-lg md:text-xl max-w-lg mb-10 leading-relaxed"
            >
              Five AI agents — Journalist, Strategist, Broker, Sentinel, and Chart Analyst —
              transforming SoSoValue market intelligence into signed, on-chain trades on SoDEX.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.52, ease }}
              className="flex flex-col sm:flex-row items-center lg:items-start gap-4 mb-12"
            >
              <Link href="/research" className="orange-btn flex items-center gap-2 text-base px-8 py-3">
                <LineChart size={18} />
                Open Research
              </Link>
              <Link href="/terminal" className="orange-btn-outline flex items-center gap-2 text-base px-8 py-3">
                Launch Terminal
                <ArrowUpRight size={18} />
              </Link>
            </motion.div>

            {/* Agent pipeline chips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65, ease }}
              className="flex items-center gap-2 flex-wrap"
            >
              {PIPELINE.map((step, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <motion.div
                    whileHover={{ y: -3, boxShadow: "0 0 24px rgba(232,97,10,0.2)" }}
                    transition={{ duration: 0.2 }}
                    className="glass-card px-3 py-2 flex items-center gap-2 shrink-0"
                  >
                    <div className="w-6 h-6 rounded-md bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
                      <step.icon size={11} className="text-bloom-orange" />
                    </div>
                    <p className="text-[11px] font-semibold text-bloom-text">{step.name}</p>
                  </motion.div>
                  {i < PIPELINE.length - 1 && (
                    <ChevronRight size={12} className="text-bloom-orange opacity-40 shrink-0 hidden sm:block" />
                  )}
                </div>
              ))}
            </motion.div>
          </div>

          {/* ─ Right: Bloom visualization ─ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.35, ease }}
            className="flex-1 w-full max-w-[520px] lg:max-w-none aspect-square lg:aspect-auto lg:h-[580px] relative"
          >
            {/* subtle label */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <span className="text-[10px] font-mono text-bloom-text-muted opacity-50 tracking-widest uppercase">Bloom · 5 Agents</span>
            </div>
            <BloomVisualization />
          </motion.div>
        </section>

        {/* ── STATS ── */}
        <section className="py-16 px-4">
          <RevealStagger className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat) => (
              <RevealItem key={stat.label}>
                <motion.div
                  whileHover={{ scale: 1.03, borderColor: "rgba(232,97,10,0.4)" }}
                  transition={{ duration: 0.2 }}
                  className="stat-card"
                >
                  <p className="text-3xl font-bold text-bloom-text">
                    <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  </p>
                  <p className="text-xs text-bloom-text-muted">{stat.label}</p>
                </motion.div>
              </RevealItem>
            ))}
          </RevealStagger>
        </section>

        {/* ── CAPABILITIES ── */}
        <section className="py-20 px-4 border-t border-bloom-border">
          <div className="max-w-5xl mx-auto">
            <RevealStagger className="text-center mb-14">
              <RevealItem>
                <div className="pill-badge mx-auto mb-4 w-fit">Platform</div>
              </RevealItem>
              <RevealItem>
                <h2 className="text-4xl md:text-5xl font-bold text-bloom-text mb-4">
                  Everything in{" "}
                  <span className="orange-gradient-text">One Terminal</span>
                </h2>
              </RevealItem>
              <RevealItem>
                <p className="text-bloom-text-muted text-lg max-w-xl mx-auto">
                  From technical chart research to AI-authored newsletters to on-chain copy trading — all connected.
                </p>
              </RevealItem>
            </RevealStagger>

            <RevealStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" staggerDelay={0.1}>
              {CAPABILITIES.map((cap) => (
                <RevealItem key={cap.title}>
                  <Link href={cap.href}>
                    <motion.div
                      whileHover={{ y: -5, borderColor: "rgba(232,97,10,0.35)", boxShadow: "0 0 32px rgba(232,97,10,0.12)" }}
                      transition={{ duration: 0.2 }}
                      className="glass-card p-6 h-full cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center mb-4 group-hover:border-bloom-border-hover transition-colors">
                        <cap.icon size={18} className="text-bloom-orange" />
                      </div>
                      <h3 className="text-base font-bold text-bloom-text mb-2 flex items-center gap-2">
                        {cap.title}
                        <ArrowUpRight size={13} className="text-bloom-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-sm text-bloom-text-muted leading-relaxed">{cap.description}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {cap.tags.map((t) => (
                          <span key={t} className="pill-badge text-[10px] py-0.5 px-2">{t}</span>
                        ))}
                      </div>
                    </motion.div>
                  </Link>
                </RevealItem>
              ))}
            </RevealStagger>
          </div>
        </section>

        {/* ── AGENTS ── */}
        <section className="py-20 px-4 border-t border-bloom-border">
          <div className="max-w-5xl mx-auto">
            <RevealStagger className="text-center mb-14">
              <RevealItem>
                <div className="pill-badge mx-auto mb-4 w-fit">How It Works</div>
              </RevealItem>
              <RevealItem>
                <h2 className="text-4xl md:text-5xl font-bold text-bloom-text mb-4">
                  From Data to{" "}
                  <span className="orange-gradient-text">On-Chain Action</span>
                </h2>
              </RevealItem>
              <RevealItem>
                <p className="text-bloom-text-muted text-lg max-w-xl mx-auto">
                  Five AI agents working in concert to transform raw market intelligence into executed, secured, on-chain positions.
                </p>
              </RevealItem>
            </RevealStagger>

            <RevealStagger className="grid grid-cols-1 md:grid-cols-2 gap-5" staggerDelay={0.12}>
              {AGENTS.map((agent, i) => (
                <RevealItem key={agent.name}>
                  <motion.div
                    whileHover={{ y: -5, boxShadow: "0 8px 40px rgba(232,97,10,0.15)" }}
                    transition={{ duration: 0.25 }}
                    className="glass-card p-7 h-full"
                  >
                    <div className="flex items-start gap-4">
                      <motion.div
                        whileHover={{ scale: 1.12, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: agent.bg }}
                      >
                        <agent.icon size={22} className="text-bloom-orange" />
                      </motion.div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-bloom-orange">0{i + 1}</span>
                          <span className="text-xs text-bloom-text-muted uppercase tracking-wider">{agent.role}</span>
                        </div>
                        <h3 className="text-lg font-bold text-bloom-text mb-2">{agent.name}</h3>
                        <p className="text-sm text-bloom-text-muted leading-relaxed">{agent.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-bloom-border">
                      <div className="flex flex-wrap gap-2">
                        {agent.tags.map((tag) => (
                          <span key={tag} className="pill-badge text-xs">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </RevealItem>
              ))}
            </RevealStagger>
          </div>
        </section>

        {/* ── INTEGRATIONS ── */}
        <section className="py-20 px-4 border-t border-bloom-border">
          <div className="max-w-5xl mx-auto">
            <RevealStagger className="text-center mb-14">
              <RevealItem>
                <div className="pill-badge mx-auto mb-4 w-fit">Powered By</div>
              </RevealItem>
              <RevealItem>
                <h2 className="text-4xl font-bold text-bloom-text mb-4">
                  Built on{" "}
                  <span className="orange-gradient-text">SoSoValue Ecosystem</span>
                </h2>
              </RevealItem>
              <RevealItem>
                <p className="text-bloom-text-muted max-w-xl mx-auto">
                  Every layer of Bloom AI natively integrates with SoSoValue's infrastructure — Terminal API, SSI Protocol, and SoDEX on ValueChain L1.
                </p>
              </RevealItem>
            </RevealStagger>

            <RevealStagger className="grid grid-cols-1 md:grid-cols-3 gap-5" staggerDelay={0.14}>
              {INTEGRATIONS.map((int) => (
                <RevealItem key={int.name}>
                  <motion.div
                    whileHover={{ y: -5, borderColor: "rgba(232,97,10,0.35)", boxShadow: "0 0 32px rgba(232,97,10,0.12)" }}
                    transition={{ duration: 0.2 }}
                    className="glass-card p-6 h-full"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                      className="w-10 h-10 rounded-xl bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center mb-4"
                    >
                      <int.icon size={18} className="text-bloom-orange" />
                    </motion.div>
                    <h3 className="text-base font-bold text-bloom-text mb-2">{int.name}</h3>
                    <p className="text-sm text-bloom-text-muted leading-relaxed">{int.description}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {int.endpoints.map((ep) => (
                        <code key={ep} className="text-xs bg-bloom-bg border border-bloom-border rounded-lg px-2 py-0.5 text-bloom-text-muted font-mono">
                          {ep}
                        </code>
                      ))}
                    </div>
                  </motion.div>
                </RevealItem>
              ))}
            </RevealStagger>
          </div>
        </section>

        {/* ── CTA BAND ── */}
        <section className="py-24 px-4">
          <RevealStagger>
            <RevealItem>
              <motion.div
                whileHover={{ boxShadow: "0 0 80px rgba(232,97,10,0.25)" }}
                transition={{ duration: 0.4 }}
                className="max-w-3xl mx-auto text-center glass-card p-12 border-bloom-border-hover shadow-orange-glow-lg"
              >
                <div className="pill-badge-orange mx-auto mb-6 w-fit">
                  <span className="live-dot" />
                  Live on SoDEX Testnet
                </div>
                <h2 className="text-4xl font-bold text-bloom-text mb-4">
                  Start Your{" "}
                  <span className="orange-gradient-text">One-Person Empire</span>
                </h2>
                <p className="text-bloom-text-muted mb-8 max-w-lg mx-auto">
                  Connect your wallet, subscribe to an AI-generated strategy, and let Bloom AI execute — from newsletter to on-chain fill in seconds.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/research" className="orange-btn flex items-center gap-2 text-base px-10 py-3 w-full sm:w-auto justify-center">
                    Open Research
                    <LineChart size={18} />
                  </Link>
                  <Link href="/strategies" className="orange-btn-outline flex items-center gap-2 text-base px-10 py-3 w-full sm:w-auto justify-center">
                    Browse Strategies
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </motion.div>
            </RevealItem>
          </RevealStagger>
        </section>

        {/* ── FOOTER ── */}
        <footer className="border-t border-bloom-border py-10 px-6">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-bloom-text-muted">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-bloom-text">Bloom AI</span>
              <span>·</span>
              <span>Built for SoSoValue Buildathon 2026</span>
            </div>
            <div className="flex items-center gap-2 text-xs bg-bloom-orange-dim border border-bloom-border-hover rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-bloom-orange animate-pulse" />
              <span className="text-bloom-orange font-medium">Powered by SoSoValue</span>
            </div>
            <div className="flex items-center gap-5">
              {[
                { label: "Research",   href: "/research"   },
                { label: "Terminal",   href: "/terminal"   },
                { label: "Strategies", href: "/strategies" },
                { label: "Copy Trade", href: "/copy-trade" },
                { label: "Docs",       href: "/docs"       },
              ].map(({ label, href }) => (
                <Link key={label} href={href} className="hover:text-bloom-text transition-colors duration-200">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

// ─── Static data ─────────────────────────────────────────────────────────────

const PIPELINE = [
  { name: "Journalist",     role: "Data & Narrative", icon: Newspaper },
  { name: "Chart Analyst",  role: "TA & Signals",     icon: LineChart  },
  { name: "Strategist",     role: "Portfolio Gen",    icon: Layers     },
  { name: "Broker",         role: "Order Execution",  icon: Zap        },
  { name: "Sentinel",       role: "Risk Guard",       icon: Shield     },
];

const STATS = [
  { label: "Total TVL",             value: 248,   prefix: "$", suffix: "M+" },
  { label: "Newsletters Published", value: 1420,  suffix: "+"               },
  { label: "Strategies On-Chain",   value: 87,    suffix: "+"               },
  { label: "Trades Executed",       value: 24300, suffix: "+"               },
];

const CAPABILITIES = [
  {
    title: "Research",
    href: "/research",
    icon: LineChart,
    description: "Professional chart view with AI signals, orderbook depth, confluence indicators, and SoSoValue news sentiment — all in one page.",
    tags: ["Chart", "Signals", "Orderbook", "Confluence", "Sentiment"],
  },
  {
    title: "Smart Money Terminal",
    href: "/terminal",
    icon: Newspaper,
    description: "AI-authored macro newsletters, ETF fund flows, DeFi TVL, perpetuals positions, and live market heatmap.",
    tags: ["ETF Flows", "DeFi TVL", "Perps", "Heatmap"],
  },
  {
    title: "Copy Trade",
    href: "/copy-trade",
    icon: Copy,
    description: "One-click copy trading: Sentinel risk checks, EIP-712 signing, and direct on-chain execution on SoDEX Testnet.",
    tags: ["EIP-712", "SoDEX", "ValueChain L1"],
  },
  {
    title: "Strategies (SSI)",
    href: "/strategies",
    icon: Layers,
    description: "Browse AI-curated on-chain index strategies (RWA, DeFi, MAG7) minted via the SSI Protocol.",
    tags: ["SSI Protocol", "Indices", "On-Chain"],
  },
  {
    title: "Market Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    description: "Live market overview with price cards, ETF flow tables, market narratives, and newsletter summaries.",
    tags: ["Prices", "ETF", "Narratives"],
  },
  {
    title: "Documentation",
    href: "/docs",
    icon: BookOpen,
    description: "Full API reference, agent architecture docs, market intelligence panel guides, and endpoint documentation.",
    tags: ["API Docs", "Architecture", "Endpoints"],
  },
];

const AGENTS = [
  {
    name: "The Journalist",
    role: "Data Ingestion & Narrative",
    icon: Brain,
    bg: "rgba(232,97,10,0.12)",
    description:
      "Continuously polls the SoSoValue Terminal API for ETF net inflows/outflows, AI news sentiment, and category momentum. Synthesizes complex quantitative data into human-readable Smart Money newsletters via a RAG pipeline.",
    tags: ["SoSoValue Terminal API", "CoinGecko", "CryptoPanic", "LLM RAG"],
  },
  {
    name: "The Chart Analyst",
    role: "Technical Analysis",
    icon: LineChart,
    bg: "rgba(245,160,32,0.10)",
    description:
      "Fetches OHLCV klines from SoDEX for BTC, ETH, and SOL, computes RSI, SMA, and trend signals, then generates LLM-powered commentary for the Research page Signals tab.",
    tags: ["SoDEX Klines", "RSI", "SMA", "LLM Commentary"],
  },
  {
    name: "The Strategist",
    role: "Portfolio Generation",
    icon: Layers,
    bg: "rgba(232,97,10,0.10)",
    description:
      "Receives Journalist insights and translates them into actionable on-chain portfolios. Interfaces with the SSI Protocol to mint bespoke Wrapped Token indices tracking the prevailing macro narrative with optimal weights.",
    tags: ["SSI Protocol", "Index Minting", "Portfolio Weights", "DefiLlama"],
  },
  {
    name: "The Broker",
    role: "Copy-Trade Execution",
    icon: Zap,
    bg: "rgba(232,97,10,0.12)",
    description:
      "When a user clicks Copy Strategy, the Broker constructs EIP-712 signed order payloads per the exact SoDEX spec — strict field order, DecimalString serialization, compact JSON — then submits to ValueChain.",
    tags: ["SoDEX REST API", "EIP-712", "ValueChain L1", "WebSocket"],
  },
  {
    name: "The Sentinel",
    role: "Deterministic Risk Guard",
    icon: Shield,
    bg: "rgba(245,160,32,0.10)",
    description:
      "A hardcoded, non-AI circuit breaker between the Broker and the blockchain. Verifies every payload against max slippage, quantity caps, daily exposure limits, and whitelisted contracts before any execution fires.",
    tags: ["Circuit Breaker", "Slippage Guard", "Address Whitelist", "Audit Log"],
  },
];

const INTEGRATIONS = [
  {
    name: "SoSoValue Terminal",
    icon: Activity,
    description:
      "Real-time ETF fund flows, AI-driven news sentiment, crypto market snapshots, and macro economic indicators — the intelligence backbone of every Bloom AI newsletter.",
    endpoints: ["/etf/flows", "/news/sentiment", "/market/snapshot"],
  },
  {
    name: "SSI Protocol",
    icon: Layers,
    description:
      "EVM-compatible on-chain index creation. Bloom AI mints custom Wrapped Token indices backed by licensed custodians, representing the exact portfolio weightings from the Strategist agent.",
    endpoints: ["Index Mint", "Rebalance", "TVL Query"],
  },
  {
    name: "SoDEX · ValueChain",
    icon: Zap,
    description:
      "100,000 TPS decentralized on-chain orderbook. Bloom AI executes spot and perpetual orders via EIP-712 typed signatures on Testnet (138565) and Mainnet (286623).",
    endpoints: ["/trade/orders", "/markets/tickers", "/ws/spot"],
  },
];
