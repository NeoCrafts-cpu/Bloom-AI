# Bloom AI

**Agentic Financial Media & Execution Network (AFMEN)** — SoSoValue market intelligence → AI newsletters → Sentinel risk gate → SoDEX testnet copy-trade execution.

Built for the [SoSoValue 2026 Buildathon](https://sosovalue.com).

## Live Demo

| Service | URL |
|---------|-----|
| Frontend | Deploy on Vercel (`apps/web`) |
| API | `https://bloom-ai-mqrb.onrender.com` |
| Health | `https://bloom-ai-mqrb.onrender.com/health` |

## Core Flow

```
SoSoValue API + SoDEX → Journalist → Chart Analyst → Strategist → Sentinel preview
    → User selects strategy → Wallet EIP-712 sign → Sentinel check → Broker → SoDEX testnet
    → Performance tracking (verified session trades only)
```

Run **Run Full Pipeline** on the dashboard to generate strategies before copy-trading.

## Target Users

Retail and crypto-native traders who want institutional-style market intelligence with one-click, risk-gated copy trading on-chain.

## Architecture

```
apps/
  web/        Next.js 15 frontend (Vercel)
  api/        Fastify 4 API with 5 agents (Render/Railway)
packages/
  types/      Shared TypeScript interfaces
```

### Agents

| Agent | Role |
|-------|------|
| **Journalist** | Polls SoSoValue ETF flows, news, sentiment every 10 min |
| **Chart Analyst** | SoDEX klines + RSI/SMA technical analysis |
| **Strategist** | Converts newsletter narrative → SSI index weights (pipeline-generated) |
| **Sentinel** | 8 deterministic risk rules — blocks bad trades |
| **Broker** | Multi-asset SoDEX batch orders on user confirmation only |

## Quick Start

```bash
# Install
npm install --legacy-peer-deps

# Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Run both servers
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4000
- Health: http://localhost:4000/health

## Environment Variables

### API (`apps/api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SOSOVALUE_API_KEY` | Yes | SoSoValue Terminal API key |
| `SODEX_API_PRIVATE_KEY` | For live execution | EIP-712 signing key for SoDEX |
| `OPENROUTER_API_KEY` | Optional | LLM for newsletters (template fallback if empty) |
| `WEB_URL` | Production | Frontend URL for CORS |
| `PORT` | No | Default 4000 |

### Web (`apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API URL (default: Render proxy) |

## 5-Minute Judge Demo Script

1. **Health check** — Open `/health` → confirm `integrations.sodex.ok`, `integrations.sosovalue.ok`
2. **Run pipeline** — Dashboard → **Run Full Pipeline** → verify strategist generates an SSI index
3. **Terminal** — `/terminal` → live newsletters with SoSoValue ETF data
4. **Strategies** — `/strategies` → pick the pipeline-generated strategy
5. **Copy Trade** — `/copy-trade` → connect MetaMask → sign → Sentinel → confirm execution
6. **Performance** — `/performance` → verified trade history (no fabricated KPIs)

See [DEMO.md](./DEMO.md) for verification steps.

## API Endpoints

```
GET  /health                          Readiness + execution mode
GET  /api/market/etf-flows          SoSoValue ETF flows
GET  /api/newsletters               AI newsletters
POST /api/agents/pipeline/trigger   Full agent pipeline
POST /api/sentinel/check            Risk preview
POST /api/broker/execute            Copy-trade execution (requires wallet signature)
GET  /api/copy-trade/performance    Per-strategy outcomes
GET  /api/copy-trade/audit          Sentinel blocks + errors
```

## Testing

```bash
# Build
npm run build

# Smoke test (API must be running or set API_URL)
npm run smoke

# Unit tests
npm run test:api
```

## Deployment

- **Frontend**: Vercel, root `apps/web`, rewrites `/api/*` → backend
- **Backend**: Render or Railway (long-running for agents/WS/SSE)
- **Keep-warm**: GitHub Action pings `/health` every 5 min (`.github/workflows/keep-warm.yml`)

## Wave 2 Changelog

- Real agent pipeline wiring (Journalist → Strategist → ChartAnalyst)
- Unified strategy store + broker execution path
- Server-side EIP-712 signature verification
- Persisted trade/audit storage with per-strategy performance
- Explicit live/offline/simulated UI states (no silent mock success)
- Keep-warm GitHub Action + enhanced `/health` endpoint
- README, DEMO.md, smoke tests

## Top 3 Pro Features (Wave 3)

### Opportunity Discovery Engine
- Deterministic scoring from SoSoValue ETF flows, news sentiment, fundraising, and SoDEX klines/TA
- `GET /api/market/opportunities` · `POST /api/agents/discovery/trigger` · MCP `get_opportunities`
- Surfaces on Dashboard, Research, and Terminal

### Verified Signal Ledger
- Durable JSON store for every signal lifecycle: evidence → thesis → strategy → Sentinel → execution → outcome
- `GET /api/ledger/signals`, `/signals/:id`, `/outcomes`, `/stats`
- Proof page at `/ledger` with digest verification and SIMULATED/LIVE labels

### Index Publisher Studio
- Off-chain index composer at `/strategies/studio` (on-chain SSI publishing pending SoSoValue Index API)
- Persisted drafts, rebalance history, strategy compare, detail pages
- `PUT /api/strategies/:id`, `POST /api/strategies/:id/rebalance`, `POST /api/strategies/compare`

## License

MIT — SoSoValue Buildathon submission
