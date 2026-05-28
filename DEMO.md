# Bloom AI — Demo Verification Guide

Use this checklist to verify the app works end-to-end for judging.

## Prerequisites

- MetaMask with ValueChain Testnet (Chain ID `138565`)
- SoDEX testnet account with USDC (for live execution)
- API keys configured on backend (see README)

## Step 1: API Health

```bash
curl https://bloom-ai-mqrb.onrender.com/health
```

Expected:
- `status`: `"ok"` or `"degraded"` (degraded if journalist hasn't run yet)
- `executionMode`: `"live"` if `SODEX_API_PRIVATE_KEY` set, else `"simulated"`
- `env.sosovalue`: `true`
- `journalist.cycleCount` > 0 after first run

## Step 2: SoSoValue Integration

```bash
curl https://bloom-ai-mqrb.onrender.com/api/market/etf-flows
```

Expected: JSON with ETF flow data for IBIT, FBTC, etc.

## Step 3: Trigger Agent Pipeline

```bash
curl -X POST https://bloom-ai-mqrb.onrender.com/api/agents/pipeline/trigger
```

Expected:
- `newsletter` object with title, narrative, keyAssets
- `strategy` object (SSI index) linked to newsletter
- `sentinelDryRun.passed`: `true` for default dry-run intent

## Step 4: Sentinel Check

```bash
curl -X POST https://bloom-ai-mqrb.onrender.com/api/sentinel/check \
  -H "Content-Type: application/json" \
  -d '{"strategyId":"ssi-mag7-003","newsletterId":"nl-latest","userAddress":"0x0000000000000000000000000000000000000001","allocationUSD":100,"maxSlippageBps":50}'
```

Expected: `passed: true` with 8 checks listed.

## Step 5: Copy Trade (UI)

1. Open `/copy-trade?strategy=ssi-mag7-003`
2. Connect MetaMask on ValueChain Testnet
3. Set allocation ($10–$100 for demo)
4. Sign EIP-712 authorization
5. Confirm Sentinel passes (green checks)
6. View execution result — note SIMULATED vs LIVE badge

## Step 6: Performance Verification

```bash
curl https://bloom-ai-mqrb.onrender.com/api/copy-trade/history
curl https://bloom-ai-mqrb.onrender.com/api/copy-trade/performance
curl https://bloom-ai-mqrb.onrender.com/api/copy-trade/audit
```

Expected after a trade:
- History contains the trade with `simulated: true/false`
- Performance shows `byStrategy` breakdown
- Audit log shows execution or sentinel_block entries

## Step 7: Opportunity Discovery

```bash
curl "https://bloom-ai-mqrb.onrender.com/api/market/opportunities?limit=5"
curl -X POST https://bloom-ai-mqrb.onrender.com/api/agents/discovery/trigger
```

Expected:
- Ranked opportunities with deterministic scores, evidence, missing inputs, and action (`copy` / `rebalance` / `watch`)
- Top opportunities recorded to the signal ledger

## Step 8: Verified Signal Ledger

```bash
curl https://bloom-ai-mqrb.onrender.com/api/ledger/stats
curl "https://bloom-ai-mqrb.onrender.com/api/ledger/signals?limit=10"
```

UI happy path:
1. Research → **Opportunities** tab → open ledger link on a card
2. `/ledger` → inspect evidence digests and lifecycle links
3. Performance page → **Signal Lifecycle Proof** section

## Step 9: Index Publisher Studio

```bash
curl https://bloom-ai-mqrb.onrender.com/api/strategies/ssi-mag7-003/history
curl -X POST https://bloom-ai-mqrb.onrender.com/api/strategies/compare \
  -H "Content-Type: application/json" \
  -d '{"idA":"ssi-mag7-003","idB":"ssi-defi-002","notionalUSD":10000}'
```

UI happy path:
1. `/strategies/studio` → compose weights (must sum to 100%)
2. Save draft → `/strategies/:id` → compare + rebalance history
3. Copy trade with `?strategy=&signal=` query params from ledger/opportunity cards

## Cold Start Note

Render free tier sleeps after ~15 min idle. First request may take 30s. The keep-warm GitHub Action pings every 5 min during judging.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API offline banner | Wait 30s, refresh, or trigger keep-warm |
| Simulated execution | Set `SODEX_API_PRIVATE_KEY` on Render |
| Sentinel blocked | Reduce allocation or slippage |
| Empty newsletters | `POST /api/newsletters/trigger` |
