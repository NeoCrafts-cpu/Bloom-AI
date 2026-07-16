# Bloom AI — Project Status

**Buildathon Target:** SoSoValue 2026 Buildathon  
**Demo Deadline:** May 13–17, 2026  
**Last Updated:** July 16, 2026

---

## App Overview

Bloom AI is an **Agentic Financial Media & Execution Network (AFMEN)** — the first platform to combine:
- AI-generated institutional-grade newsletters (Smart Money Terminal) powered by real SoSoValue data
- Autonomous SSI index portfolio creation with live prices from SoDEX
- One-click copy-trading via SoDEX testnet with deterministic risk controls
- Five-agent pipeline: Journalist → Chart Analyst → Strategist → Sentinel → Broker

---

## Architecture

```
apps/
  web/        Next.js 15 · TypeScript · Tailwind CSS · Framer Motion  (port 3000) → Vercel
  api/        Fastify 4  · TypeScript ESM · tsx watch                  (port 4000) → Render
packages/
  types/      Shared TypeScript interfaces (SmartMoneyNewsletter, SSIIndex, etc.)
```

---

## Wave 1 — COMPLETE ✅

### Frontend (apps/web)
| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Landing | `/` | ✅ Live | WebGL beam-shader bg, hero, stats, agents, integrations |
| Terminal | `/terminal` | ✅ Live | Live SSE newsletter feed, ETF flow cards |
| Dashboard | `/dashboard` | ✅ Live | Agent status bar, market ticker, newsletter feed |
| Strategies | `/strategies` | ✅ Live | SSI index cards, asset weights, copy CTA |
| Copy Trade | `/copy-trade` | ✅ Live | 4-step: wallet → configure (real USDC balance) → sentinel → execute |
| Roadmap | `/roadmap` | ✅ Live | Full 4-phase timeline updated |
| Docs | `/docs` | ✅ Live | Full API reference, architecture, agents, cache docs |

### Components
| Component | Status | Notes |
|-----------|--------|-------|
| VideoBackground | ✅ | WebGL GLSL — 8 beam cones, dust particles, vignette |
| Navbar | ✅ | Fixed pill-capsule, mobile menu, wallet connect CTA |
| AgentStatusBar | ✅ | 4-agent live status polling /api/agents |
| MarketTicker | ✅ | Real SoDEX prices, loading skeleton, stale badge, no MOCK_TICKERS |
| TerminalFeed | ✅ | SSE + REST newsletter feed with detail panel |
| StrategiesGrid | ✅ | SSI index cards with asset allocation bars |
| CopyTradeDashboard | ✅ | 4-step wizard, real USDC balance from SoDEX account state |
| ETFFlowsPanel | ✅ | Real SoSoValue data, `● Cached` stale indicator |
| SoSoNewsPanel | ✅ | Real SoSoValue news, `● Cached` stale indicator |
| SentinelAlert | ✅ | Risk check display component |
| OrderFeedPanel | ✅ | WebSocket real-time order fill stream |
| AnimatedCounter | ✅ | Smooth number roll-up for stats |

### Backend (apps/api)
| Module | Status | Notes |
|--------|--------|-------|
| Fastify server | ✅ | CORS, rate-limit, WebSocket, SSE |
| **cache.ts** | ✅ NEW | In-memory TTL cache — stale-while-revalidate, `{ data, cachedAt, isStale }` |
| Journalist agent | ✅ UPDATED | Publishes every 10min; real data template fallback; exports `journalistStatus` |
| Strategist agent | ✅ UPDATED | Narrative → SSI weights with live SoDEX prices |
| Broker agent | ✅ UPDATED | Resolves real accountID + symbolIDs from SoDEX before order submission |
| Sentinel agent | ✅ | 6-rule deterministic circuit breaker |
| sosovalue.ts | ✅ REWRITTEN | All MOCK_* removed; returns `{ data, cachedAt, isStale }`; SoDEX primary price |
| sodex.ts | ✅ REWRITTEN | Account state, order history, symbol map, user trades; all cached |
| routes/market.ts | ✅ REWRITTEN | 12 endpoints: prices, ETF, sentiment, account state, orderbook, order history |
| eip712.ts | ✅ | Typed data signing, Go struct field order |
| nonceManager.ts | ✅ | Thread-safe atomic nonce per address |
| MCP server | ✅ | 7 tools: ETF flows, sentiment, prices, news, DeFi TVL, SoDEX |
| Newsletter store | ✅ | In-memory (50 items), SSE broadcast |
| WebSocket manager | ✅ | Live ORDER_FILL, SENTINEL_TRIP, AGENT_STATUS events |
| Health endpoint | ✅ ENHANCED | Journalist status, cycle count, newsletter count, env key flags |

### API Endpoints (v2)
```
GET  /health                                   → { status, journalist: { status, lastRun, cycleCount }, env: { ... } }
GET  /api/newsletters                          → { data: SmartMoneyNewsletter[] }
GET  /api/newsletters/latest
POST /api/newsletters/trigger                  → force journalist cycle
GET  /api/newsletters/stream                   → SSE event stream
GET  /api/strategies
GET  /api/strategies/:id
GET  /api/agents
POST /api/agents/:name/trigger
GET  /api/market/prices                        → { data, meta: { cachedAt, isStale } }
GET  /api/market/etf-flows                     → { data, meta: { cachedAt, isStale } }
GET  /api/market/sentiment?limit=              → { data, meta: { cachedAt, isStale } }
GET  /api/market/etf-summary                   → { data: { totalNetInflow, totalAUM, ... } }
GET  /api/market/overview                      → prices + etf + sentiment in one call
GET  /api/market/sodex/tickers                 → live SoDEX spot tickers
GET  /api/market/sodex/symbols                 → SoDEX market symbol list
GET  /api/market/sodex/orderbook/:symbol       → orderbook depth
GET  /api/market/account/:address/state        → real USDC balance + open orders
GET  /api/market/account/:address/orders/history
GET  /api/market/account/:address/trades
GET  /api/mcp/tools
POST /api/mcp/execute
POST /api/sentinel/check
POST /api/broker/execute
POST /api/copy-trade/execute
WS   /ws                                       → live event hub
```

---

## Deployment

### Frontend → Vercel ✅
- Root directory: `apps/web`
- Build: auto-detected Next.js
- Env var: `NEXT_PUBLIC_API_URL=https://your-api.railway.app`
- Config: `apps/web/vercel.json`

### Backend → Railway (required — long-running WS/SSE/background agents)
- Build: `npm run build --workspace=apps/api`
- Start: `node apps/api/dist/index.js`
- Config: `railway.json` at root
- Env vars: `SOSOVALUE_API_KEY`, `OPENROUTER_API_KEY`, `SODEX_API_PRIVATE_KEY`, `PORT`

---

## Wave 2 — In Progress 🔧

| Task | Priority | Notes |
|------|----------|-------|
| SoDEX WebSocket relay | 🔴 High | `wss://testnet-gw.sodex.dev/ws/spot` → live fills to frontend |
| StrategiesGrid live prices | 🔴 High | Fetch from `/api/market/prices`, update currentPrice |
| Portfolio P&L dashboard | 🟡 Medium | Per-wallet performance tracking |
| Subscriber leaderboard | 🟡 Medium | Social copy-trade profiles |
| Redis nonce manager | 🟡 Medium | Replace in-memory nonce for multi-instance deploy |
| Postgres persistence | 🟡 Medium | Replace in-memory newsletter/strategy stores |
| E2E tests | 🟢 Low | Playwright for copy-trade flow |

---

## Environment Variables

```
# apps/api/.env
SOSOVALUE_API_KEY=SOSO-xxxxx        # https://openapi.sosovalue.com
SODEX_API_PRIVATE_KEY=              # EIP-712 signing key (optional — simulates if empty)
OPENROUTER_API_KEY=                 # https://openrouter.ai (optional — data template if empty)
OPENROUTER_MODEL=openai/gpt-4o-mini
CRYPTOPANIC_API_KEY=                # https://cryptopanic.com (optional)
PORT=4000

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Running Locally

```bash
# Install deps (root)
npm install --legacy-peer-deps

# Run both servers
npm run dev

# Or individually:
npm run dev:api     # API on :4000
npm run dev:web     # Frontend on :3000
```

---

## Bugs Fixed This Session
- ✅ All MOCK_* constants removed from sosovalue.ts and sodex.ts
- ✅ `getMarketSnapshots()` tries SoDEX first (no rate limit), CoinGecko fallback
- ✅ All service functions return `{ data, cachedAt, isStale }` — callers updated
- ✅ Journalist/Strategist agents updated to use `.data` from new return types
- ✅ Broker agent resolves real accountID + symbolIDs before order execution
- ✅ Frontend stale cache indicators on MarketTicker, ETFFlowsPanel, SoSoNewsPanel
- ✅ CopyTradeDashboard shows real USDC balance, blocks execution if insufficient
- ✅ Enhanced /health with journalist cycle count, newsletter count, env key flags
- ✅ TypeScript: 0 errors on both apps/api and apps/web
- ✅ Next.js build: all 10 pages compiled successfully
