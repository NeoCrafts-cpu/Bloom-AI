"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ArrowUpRight,
  Zap,
  Shield,
  TrendingUp,
  Brain,
  Layers,
  ChevronRight,
  Activity,
  Globe,
  Lock,
} from "lucide-react";
import LandingNavbar from "@/components/LandingNavbar";
import AnimatedCounter from "@/components/AnimatedCounter";
import VideoBackgroundClient from "@/components/VideoBackgroundClient";
import { RevealStagger, RevealItem } from "@/components/Reveal";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function HomePage() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.7], [0, -60]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <VideoBackgroundClient />

      {/* Gradient overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: "linear-gradient(to bottom, rgba(10,7,3,0.15) 0%, rgba(10,7,3,0.0) 40%, rgba(10,7,3,0.6) 100%)",
        }}
      />

      <div className="relative" style={{ zIndex: 10 }}>
        <LandingNavbar />

        {/* ── HERO ── */}
        <motion.section
          ref={heroRef}
          style={{ opacity: heroOpacity, y: heroY }}
          className="flex flex-col items-center justify-center text-center min-h-screen px-4 pt-20"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.1, ease }}
            className="pill-badge-orange mb-8"
          >
            <span className="live-dot" />
            BEST AI FINANCE 2026
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.25, ease }}
            className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6 max-w-5xl"
          >
            <span className="text-bloom-text">Redefining the Future of </span>
            <br />
            <span className="orange-gradient-text">Crypto</span>
            <span className="text-bloom-text"> and </span>
            <span className="orange-gradient-text">Fintech</span>
            <span className="text-bloom-text"> Products</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.4, ease }}
            className="text-bloom-text-muted text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
          >
            Bloom AI is an agentic financial media and execution network. From
            macro intelligence to on-chain execution — all automated, all
            transparent, all yours.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.52, ease }}
            className="flex items-center gap-4 mb-20"
          >
            <Link href="/terminal" className="orange-btn flex items-center gap-2 text-base px-8 py-3">
              Launch App
              <ArrowUpRight size={18} />
            </Link>
            <Link href="/strategies" className="orange-btn-outline flex items-center gap-2 text-base px-8 py-3">
              View Strategies
            </Link>
          </motion.div>

          {/* Hero cards */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65, ease }}
            className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 px-4"
          >
            {[
              {
                icon: TrendingUp, label: "Smart Money",
                title: "Trade with trust and assurance",
                desc: "AI-published market narratives backed by real ETF flow data",
                elevated: false,
              },
              {
                icon: Layers, label: null,
                title: "Create your own on-chain strategy",
                desc: null,
                elevated: true,
              },
              {
                icon: Globe, label: "On-Chain",
                title: "Join the Agentic Finance System",
                desc: "Whether you are an individual or an institution, harness the power of a transparent blockchain",
                elevated: false,
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5, boxShadow: `0 0 ${card.elevated ? 48 : 32}px rgba(232,97,10,${card.elevated ? 0.28 : 0.18})` }}
                transition={{ duration: 0.2 }}
                className={`glass-card p-6 text-left ${card.elevated ? "border-bloom-border-hover shadow-orange-glow-lg -mt-2 md:-mt-4" : ""}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${card.elevated ? "bg-bloom-orange" : "bg-bloom-orange-dim border border-bloom-border-hover"} flex items-center justify-center`}>
                      <card.icon size={14} className={card.elevated ? "text-bloom-bg" : "text-bloom-orange"} />
                    </div>
                    {card.label && (
                      <span className="text-xs text-bloom-text-muted font-medium uppercase tracking-wider">{card.label}</span>
                    )}
                  </div>
                </div>
                <p className={`${card.elevated ? "text-base" : "text-sm"} font-${card.elevated ? "bold" : "semibold"} text-bloom-text mb-1`}>{card.title}</p>
                {card.desc && <p className="text-xs text-bloom-text-muted">{card.desc}</p>}
                {card.elevated && (
                  <>
                    <div className="flex items-center gap-2 text-xs text-bloom-text-muted mb-3 mt-2">
                      <Lock size={12} className="text-bloom-orange" />
                      SSI Protocol secured
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bloom-bg border border-bloom-border text-xs font-mono text-bloom-text-muted">
                      <Activity size={10} className="text-bloom-orange" />
                      0x1Bloom...AI
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ── STATS ── */}
        <section className="py-24 px-4">
          <RevealStagger className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total TVL",            value: 248,   prefix: "$", suffix: "M+" },
              { label: "Newsletters Published", value: 1420,  suffix: "+"               },
              { label: "Strategies On-Chain",   value: 87,    suffix: "+"               },
              { label: "Trades Executed",       value: 24300, suffix: "+"               },
            ].map((stat) => (
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

        {/* ── FEATURES ── */}
        <section className="py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <RevealStagger className="text-center mb-16">
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
                  Four AI agents working in concert to transform raw market intelligence into executed, secured, on-chain positions.
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
        <section className="py-24 px-4 border-t border-bloom-border">
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
                  <Link href="/terminal" className="orange-btn flex items-center gap-2 text-base px-10 py-3 w-full sm:w-auto justify-center">
                    Open Terminal
                    <ArrowUpRight size={18} />
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
                { label: "Terminal",    href: "/terminal"   },
                { label: "Dashboard",  href: "/dashboard"  },
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
    name: "The Strategist",
    role: "Portfolio Generation",
    icon: Layers,
    bg: "rgba(245,160,32,0.10)",
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
      "When a user clicks Copy Strategy, the Broker intercepts the intent and constructs EIP-712 signed order payloads per the exact SoDEX spec — strict field order, DecimalString serialization, compact JSON — then submits to ValueChain.",
    tags: ["SoDEX REST API", "EIP-712", "ValueChain L1", "WebSocket"],
  },
  {
    name: "The Sentinel",
    role: "Deterministic Risk Guard",
    icon: Shield,
    bg: "rgba(245,160,32,0.10)",
    description:
      "A hardcoded, non-AI circuit breaker that sits between the Broker and the blockchain. Verifies every payload against max slippage, quantity caps, daily exposure limits, and whitelisted contracts before any execution fires.",
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
