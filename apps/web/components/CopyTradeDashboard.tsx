"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useSignTypedData } from "wagmi";
import { injected } from "wagmi/connectors";
import { Wallet, Shield, Zap, CheckCircle, XCircle, Loader, ExternalLink, Layers, ArrowRight } from "lucide-react";
import type { CopyTradeIntent, CopyTradeResult, SentinelReport, SSIIndex } from "@bloom-ai/types";
import SentinelAlert from "./SentinelAlert";
import OrderFeedPanel from "./OrderFeedPanel";
import AutoCopyPanel from "./AutoCopyPanel";
import { valueChainTestnet } from "@/lib/wagmi";
import { VALUECHAIN_TESTNET, VALUECHAIN_WALLET_PARAMS, SODEX_TESTNET_TRADE_URL, isOnChainTxHash } from "@/lib/valuechain";

type Step = "connect" | "configure" | "signing" | "sentinel" | "executing" | "complete" | "blocked";

const API = "";

export default function CopyTradeDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const strategyId = searchParams?.get("strategy") ?? "";

  // -- Wagmi hooks ------------------------------------------------------------
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signTypedDataAsync } = useSignTypedData();

  // -- Local state ------------------------------------------------------------
  const [step, setStep]                     = useState<Step>("connect");
  const [allocation, setAllocation]         = useState<number>(100);
  const [slippage, setSlippage]             = useState<number>(50); // bps
  const [venue, setVenue]                   = useState<"spot" | "perps">("spot");
  const [leverage, setLeverage]             = useState<number>(1);
  const [executionStyle, setExecutionStyle] = useState<"market" | "twap">("market");
  const [twapDurationSec, setTwapDurationSec] = useState<number>(300);
  const [sentinelReport, setSentinelReport] = useState<SentinelReport | null>(null);
  const [tradeResult, setTradeResult]       = useState<CopyTradeResult | null>(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [userSignature, setUserSignature]   = useState<string>("");
  const [txHash, setTxHash]                 = useState<string>("");
  const [usdcBalance, setUsdcBalance]       = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [execError, setExecError]           = useState<string | null>(null);
  const [strategies, setStrategies]         = useState<SSIIndex[]>([]);
  const [strategiesLoading, setStrategiesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStrategiesLoading(true);
      try {
        const res = await fetch(`${API}/api/strategies`);
        const json = res.ok ? await res.json() : null;
        if (!cancelled) setStrategies(Array.isArray(json?.data) ? json.data : []);
      } catch {
        if (!cancelled) setStrategies([]);
      } finally {
        if (!cancelled) setStrategiesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedStrategy = strategies.find((s) => s.id === strategyId) ?? null;

  const selectStrategy = (id: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("strategy", id);
    router.push(`/copy-trade?${params.toString()}`);
  };

  // If wallet connects externally, advance step + fetch that wallet's SoDEX balance
  useEffect(() => {
    if (isConnected && step === "connect") {
      setStep("configure");
    }
    if (!isConnected) {
      setStep("connect");
      setUsdcBalance(null);
    }
  }, [isConnected, step]);

  // Each user trades from their own connected SoDEX account balance
  useEffect(() => {
    if (isConnected && address) fetchAccountBalance(address);
  }, [isConnected, address]);

  // Fetch real USDC balance from SoDEX account state
  const fetchAccountBalance = async (addr: string) => {
    setBalanceLoading(true);
    setUsdcBalance(null);
    try {
      const res = await fetch(`${API}/api/market/account/${addr}/state`);
      if (!res.ok) return;
      const json = await res.json();
      const balances: { asset: string; available: string }[] = json?.data?.balances ?? [];
      const usdc = balances.find((b) => b.asset === "USDC" || b.asset === "vUSDC");
      if (usdc) setUsdcBalance(parseFloat(usdc.available));
    } catch {
      // Non-critical — wallet may not yet have a SoDEX account
    } finally {
      setBalanceLoading(false);
    }
  };

  // -- Prepare basket → MetaMask signs SoDEX ExchangeAction → submit ----------
  const signAuthorization = async () => {
    if (!address) return;
    if (!strategyId) {
      setExecError("Choose a pipeline-generated strategy before copy trading.");
      setStep("configure");
      return;
    }
    if (venue === "perps" || executionStyle === "twap") {
      setExecError("Per-wallet trading supports Spot + MARKET only. Switch Venue/Execution and retry.");
      return;
    }

    setIsLoading(true);
    setExecError(null);
    setStep("signing");

    const TARGET_CHAIN_ID = VALUECHAIN_TESTNET.chainId;
    const TARGET_CHAIN_HEX = VALUECHAIN_TESTNET.chainIdHex;

    if (!window.ethereum) {
      alert("MetaMask not detected.");
      setStep("configure");
      setIsLoading(false);
      return;
    }

    const eth = window.ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: TARGET_CHAIN_HEX }] });
    } catch (switchErr: unknown) {
      if ((switchErr as { code?: number })?.code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [VALUECHAIN_WALLET_PARAMS],
          });
        } catch {
          setStep("configure");
          setIsLoading(false);
          return;
        }
      } else {
        setStep("configure");
        setIsLoading(false);
        return;
      }
    }

    const currentChainId = await eth.request({ method: "eth_chainId" }) as string;
    if (parseInt(currentChainId, 16) !== TARGET_CHAIN_ID) {
      alert(`Please switch MetaMask to ValueChain Testnet (Chain ID ${TARGET_CHAIN_ID}) before signing.`);
      setStep("configure");
      setIsLoading(false);
      return;
    }

    const intent: CopyTradeIntent = {
      strategyId,
      newsletterId: "nl-latest",
      userAddress: address,
      allocationUSD: allocation,
      maxSlippageBps: slippage,
      venue: "spot",
      executionStyle: "market",
    };

    try {
      setStep("sentinel");
      const prepRes = await fetch(`${API}/api/broker/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intent),
      });
      const prepJson = await prepRes.json().catch(() => ({}));
      if (!prepRes.ok) {
        if (prepJson?.data?.sentinelStatus === "blocked") {
          setSentinelReport(prepJson.data.sentinelReport as SentinelReport);
          setStep("blocked");
          return;
        }
        throw new Error((prepJson as { error?: string }).error ?? "Prepare failed");
      }

      type LegPrep = {
        prepareId: string;
        preview: { symbol: string; allocationUSD: number }[];
        typedData: {
          domain: {
            name: string;
            version: string;
            chainId: number;
            verifyingContract: `0x${string}`;
          };
          types: { ExchangeAction: { name: string; type: string }[] };
          primaryType: "ExchangeAction";
          message: { payloadHash: `0x${string}`; nonce: number };
        };
      };

      const prep = prepJson.data as {
        intentId: string;
        sentinelReport: SentinelReport;
        skipped?: string[];
        legs: LegPrep[];
      };

      if (!Array.isArray(prep.legs) || prep.legs.length === 0) {
        throw new Error("No tradable legs to sign");
      }

      setSentinelReport(prep.sentinelReport);
      setStep("signing");

      // Sign & execute each leg separately — cancel-only symbols (often ETH) are skipped
      const allOrders: CopyTradeResult["orders"] = [];
      const skippedLegs: string[] = [...(prep.skipped ?? [])];
      let lastSig = "";

      for (let i = 0; i < prep.legs.length; i++) {
        const leg = prep.legs[i];
        const label = leg.preview[0]?.symbol ?? `leg ${i + 1}`;
        setStep("signing");

        let sodexSignature: string;
        try {
          sodexSignature = await signTypedDataAsync({
            domain: leg.typedData.domain,
            types: leg.typedData.types,
            primaryType: "ExchangeAction",
            message: {
              payloadHash: leg.typedData.message.payloadHash,
              nonce: BigInt(leg.typedData.message.nonce),
            },
          });
        } catch (signErr) {
          // User rejected mid-basket — keep any fills already done
          if (allOrders.length > 0) break;
          throw signErr;
        }

        lastSig = sodexSignature;
        setUserSignature(sodexSignature);
        setStep("executing");

        const execRes = await fetch(`${API}/api/broker/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prepareId: leg.prepareId,
            sodexSignature,
            userAddress: address,
            strategyId,
            allocationUSD: allocation,
            maxSlippageBps: slippage,
            newsletterId: "nl-latest",
          }),
        });
        const execJson = await execRes.json().catch(() => ({}));
        if (!execRes.ok) {
          const errMsg = (execJson as { error?: string }).error ?? "Execution failed";
          if (/cancel\s*only/i.test(errMsg)) {
            skippedLegs.push(`${label}:cancel-only`);
            continue;
          }
          // Non-cancel-only failure: if we already have fills, stop; else hard fail
          if (allOrders.length > 0) {
            skippedLegs.push(`${label}:${errMsg.slice(0, 80)}`);
            break;
          }
          throw new Error(errMsg);
        }
        const legResult = (execJson?.data ?? execJson) as CopyTradeResult;
        if (Array.isArray(legResult?.orders)) {
          allOrders.push(...legResult.orders);
        }
      }

      if (allOrders.length === 0) {
        throw new Error(
          `No fills — all legs failed or were cancel-only.` +
            (skippedLegs.length ? ` (${skippedLegs.join(", ")})` : ""),
        );
      }

      const result: CopyTradeResult = {
        intentId: prep.intentId,
        sentinelStatus: "passed",
        orders: allOrders,
        totalExecutedUSD: allOrders.reduce((s, o) => s + o.fillPrice * o.fillQuantity, 0),
        timestamp: new Date().toISOString(),
        source: "manual",
      };
      if (skippedLegs.length) {
        result.sentinelReason = `Partial basket — skipped: ${skippedLegs.join(", ")}`;
      }

      setTradeResult(result);
      setUserSignature(lastSig);
      const firstOrderId = result.orders[0]?.orderId;
      setTxHash(isOnChainTxHash(firstOrderId) ? firstOrderId! : "");
      setStep("complete");
      fetchAccountBalance(address);
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (msg.includes("ChainMismatch") || msg.includes("chain")) {
        alert("Chain mismatch detected. Please disconnect your wallet, refresh the page, and reconnect.");
      }
      console.error("User-wallet trade failed", err);
      setExecError(msg);
      setStep("configure");
    } finally {
      setIsLoading(false);
    }
  };


  // Switch to ValueChain Testnet — tries switch first, falls back to add
  const addValueChainNetwork = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Please install MetaMask first.");
      return;
    }
    const eth = window.ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: VALUECHAIN_TESTNET.chainIdHex }],
      });
    } catch (switchErr: unknown) {
      if ((switchErr as { code?: number })?.code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [VALUECHAIN_WALLET_PARAMS],
          });
        } catch { /* user rejected add */ }
      }
    }
  };
  const reset = () => {
    setStep(isConnected ? "configure" : "connect");
    setSentinelReport(null);
    setTradeResult(null);
    setUserSignature("");
    setTxHash("");
    setExecError(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Left — wizard steps */}
      <div className="lg:col-span-2 space-y-5">

        {/* Step 1 — Pick Strategy (always first, always visible) */}
        <StepCard
          step={1}
          title="Pick a Strategy"
          icon={Layers}
          active={!strategyId}
          completed={Boolean(strategyId)}
          forceShow
        >
          {strategyId && selectedStrategy ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-xs font-mono text-bloom-orange">{selectedStrategy.symbol}</code>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-800/40 text-emerald-400 bg-emerald-900/20">
                    Selected
                  </span>
                </div>
                <p className="text-base font-bold text-bloom-text">{selectedStrategy.name}</p>
                <p className="text-xs text-bloom-text-muted mt-1 line-clamp-2">
                  {(Array.isArray(selectedStrategy.assets) ? selectedStrategy.assets : [])
                    .slice(0, 5)
                    .map((a) => `${a.symbol} ${(a.weight * 100).toFixed(0)}%`)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/strategies/${strategyId}`} className="orange-btn-outline text-xs px-3 py-2">
                  Review
                </Link>
                <button
                  type="button"
                  onClick={() => router.push("/copy-trade")}
                  className="text-xs text-bloom-text-muted hover:text-bloom-orange px-2"
                >
                  Change
                </button>
              </div>
            </div>
          ) : strategyId ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-bloom-orange">{strategyId.toUpperCase()}</p>
                <p className="text-xs text-bloom-text-muted mt-1">Strategy selected — continue below.</p>
              </div>
              <button type="button" onClick={() => router.push("/copy-trade")} className="orange-btn-outline text-xs px-3 py-2">
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-bloom-text-muted">
                Choose which SSI basket to copy on SoDEX. This is required before you can sign or execute.
              </p>
              {strategiesLoading ? (
                <div className="h-20 shimmer rounded-xl" />
              ) : strategies.length === 0 ? (
                <div className="rounded-xl border border-amber-800/30 bg-amber-950/20 p-4 space-y-3">
                  <p className="text-sm text-amber-400 font-semibold">No strategies yet</p>
                  <p className="text-xs text-bloom-text-muted">
                    Run the agent pipeline on Home, then come back — or open Strategies to mint one.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard" className="orange-btn text-xs px-4 py-2">Run pipeline</Link>
                    <Link href="/strategies" className="orange-btn-outline text-xs px-4 py-2">Open Strategies</Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {strategies.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectStrategy(s.id)}
                      className="w-full text-left rounded-xl border border-bloom-border hover:border-bloom-border-hover hover:bg-white/5 p-3 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-[10px] font-mono text-bloom-orange">{s.symbol}</code>
                            <span className="text-sm font-semibold text-bloom-text truncate">{s.name}</span>
                          </div>
                          <p className="text-[11px] text-bloom-text-muted mt-0.5 truncate">
                            {(Array.isArray(s.assets) ? s.assets : [])
                              .slice(0, 4)
                              .map((a) => a.symbol)
                              .join(" · ")}
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-bloom-text-muted group-hover:text-bloom-orange shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <Link href="/strategies" className="inline-flex items-center gap-1.5 text-xs text-bloom-orange hover:underline">
                Browse full Strategies page <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </StepCard>

        {/* Step 2 — Connect Wallet */}
        <StepCard step={2} title="Connect Wallet" icon={Wallet}
          active={Boolean(strategyId) && step === "connect"}
          completed={step !== "connect"}
          disabled={!strategyId}>
          {!strategyId ? (
            <p className="text-xs text-bloom-text-muted">Pick a strategy above first.</p>
          ) : step === "connect" ? (
            <div className="space-y-4">
              <p className="text-sm text-bloom-text-muted">
                Connect your EVM wallet (MetaMask or any injected provider) to authorize copy-trade execution on{" "}
                <span className="text-bloom-orange font-medium">SoDEX Testnet (ValueChain L1)</span>.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => connect({ connector: injected() })}
                  disabled={isConnecting}
                  className="orange-btn flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {isConnecting ? <Loader size={14} className="animate-spin" /> : <Wallet size={14} />}
                  {isConnecting ? "Connecting..." : "Connect MetaMask"}
                </button>
                <button
                  onClick={addValueChainNetwork}
                  className="orange-btn-outline flex items-center gap-2 text-sm"
                >
                  <ExternalLink size={14} />
                  Switch to ValueChain Testnet
                </button>
              </div>
              <p className="text-xs text-bloom-text-muted">
                No wallet?{" "}
                <a href="https://metamask.io" target="_blank" rel="noopener noreferrer"
                  className="text-bloom-orange hover:underline">Download MetaMask</a>
                {" "}then click &quot;Switch to ValueChain Testnet&quot; to add the network (Chain ID: 138565).
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <code className="text-bloom-text font-mono">{address}</code>
              </div>
              <button onClick={() => disconnect()} className="text-xs text-bloom-text-muted hover:text-red-400 transition-colors">
                Disconnect
              </button>
            </div>
          )}
        </StepCard>

        {/* Step 3 — Configure */}
        <StepCard step={3} title="Set Size & Venue" icon={Zap}
          active={step === "configure"}
          completed={["signing", "sentinel", "executing", "complete", "blocked"].includes(step)}
          disabled={!strategyId || step === "connect"}>
          {step === "configure" && (
            <div className="space-y-5">
              {/* Allocation guidance — conservative defaults, no fabricated win rates */}
              <div className="glass-card p-4 border border-bloom-border-hover bg-gradient-to-br from-amber-950/20 to-bloom-bg-2/60">
                <p className="text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
                  Allocation Guidance
                </p>
                <p className="text-xs text-bloom-text-muted leading-relaxed">
                  Start with a small allocation ($10–$100) until you have verified trade history.
                  Sentinel enforces max order size, daily exposure, slippage, and circuit-breaker limits before execution.
                </p>
                {usdcBalance !== null && (
                  <p className="text-xs text-bloom-text-muted mt-2">
                    Suggested max for first trade:{" "}
                    <span className="text-amber-400 font-bold">
                      ${Math.min(100, Math.max(10, Math.floor(usdcBalance * 0.05))).toLocaleString()}
                    </span>
                    {" "}(5% of balance, capped at $100)
                  </p>
                )}
              </div>

              <div className="text-xs text-emerald-300/90 bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-2 leading-relaxed">
                Fills spend USDC from <span className="font-semibold">your connected SoDEX account</span>
                {address ? (
                  <> (<span className="font-mono">{address.slice(0, 6)}…{address.slice(-4)}</span>)</>
                ) : null}
                . MetaMask signs the SoDEX order batch directly.
              </div>

              {/* USDC Balance from connected wallet's SoDEX account */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-bloom-text-muted font-semibold uppercase tracking-wider">
                  Your SoDEX USDC Balance
                </span>
                {balanceLoading ? (
                  <span className="text-bloom-text-muted animate-pulse">Loading...</span>
                ) : usdcBalance !== null ? (
                  <span className={`font-bold ${usdcBalance < allocation ? "text-red-400" : "text-emerald-400"}`}>
                    ${usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    {usdcBalance < allocation && " (insufficient)"}
                  </span>
                ) : (
                  <span className="text-bloom-text-muted">No SoDEX account yet — claim/deposit on SoDEX testnet</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
                  Allocation (USD)
                </label>
                <div className="flex items-center gap-3">
                  <input type="range" min={10} max={10000} step={10} value={allocation}
                    onChange={(e) => setAllocation(Number(e.target.value))}
                    className="flex-1 accent-bloom-orange" />
                  <span className="text-bloom-text font-bold text-sm w-20 text-right">
                    ${allocation.toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
                  Max Slippage: {(slippage / 100).toFixed(2)}%
                </label>
                <div className="flex items-center gap-3">
                  <input type="range" min={10} max={200} step={5} value={slippage}
                    onChange={(e) => setSlippage(Number(e.target.value))}
                    className="flex-1 accent-bloom-orange" />
                  <span className="text-bloom-text font-bold text-sm w-20 text-right">
                    {(slippage / 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
                  Venue
                </label>
                <div className="flex gap-2">
                  {(["spot", "perps"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVenue(v)}
                      className={`text-xs px-3 py-1.5 rounded-full border capitalize ${
                        venue === v
                          ? "border-bloom-border-hover bg-bloom-orange-dim text-bloom-orange"
                          : "border-bloom-border text-bloom-text-muted"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {venue === "perps" && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
                      Leverage: {leverage}x
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={1}
                      value={leverage}
                      onChange={(e) => setLeverage(Number(e.target.value))}
                      className="w-full accent-bloom-orange"
                    />
                    <p className="text-[10px] text-amber-400 mt-1">
                      Requires SODEX_ENABLE_PERPS_COPY=1 on the API — Sentinel enforces max leverage.
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
                  Execution
                </label>
                <div className="flex gap-2">
                  {(["market", "twap"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setExecutionStyle(style)}
                      className={`text-xs px-3 py-1.5 rounded-full border uppercase ${
                        executionStyle === style
                          ? "border-bloom-border-hover bg-bloom-orange-dim text-bloom-orange"
                          : "border-bloom-border text-bloom-text-muted"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
                {executionStyle === "twap" && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
                      TWAP window: {Math.round(twapDurationSec / 60)}m
                    </label>
                    <input
                      type="range"
                      min={60}
                      max={3600}
                      step={60}
                      value={twapDurationSec}
                      onChange={(e) => setTwapDurationSec(Number(e.target.value))}
                      className="w-full accent-bloom-orange"
                    />
                    <p className="text-[10px] text-amber-400 mt-1">
                      Basket TWAP via SoDEX — requires SODEX_ENABLE_TWAP=1. Macro Sentinel hard-gates near high-importance events.
                    </p>
                  </div>
                )}
              </div>
              {usdcBalance !== null && usdcBalance < allocation && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                  Insufficient USDC in your SoDEX account. Reduce allocation or deposit USDC on SoDEX testnet.
                </div>
              )}
              {execError && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                  {execError}
                </div>
              )}
              <button onClick={signAuthorization}
                disabled={isLoading || !strategyId || (usdcBalance !== null && usdcBalance < allocation)}
                className="orange-btn flex items-center gap-2 text-sm disabled:opacity-50">
                <Shield size={14} />
                Sign SoDEX Order with MetaMask
              </button>
            </div>
          )}
          {["signing", "sentinel", "executing", "complete", "blocked"].includes(step) && (
            <p className="text-xs text-bloom-text-muted">
              ${allocation.toLocaleString()} → <span className="text-bloom-orange">{strategyId.toUpperCase()}</span> · Max slippage {(slippage / 100).toFixed(2)}%
            </p>
          )}
        </StepCard>

        {/* Step 4 — Signing */}
        {["signing", "sentinel", "executing", "complete"].includes(step) && (
          <StepCard step={4} title="SoDEX Order Signature" icon={Shield}
            active={step === "signing"}
            completed={["sentinel", "executing", "complete"].includes(step)}>
            {userSignature ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle size={13} /> Signed by your wallet
                </div>
                <code className="block text-xs font-mono text-bloom-text-muted break-all bg-bloom-bg rounded-xl p-3 border border-bloom-border">
                  {userSignature.slice(0, 80)}…
                </code>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-bloom-text-muted">
                <Loader size={14} className="animate-spin text-bloom-orange" />
                Waiting for MetaMask signature…
              </div>
            )}
          </StepCard>
        )}

        {/* Step 5 — Sentinel */}
        {sentinelReport && (
          <StepCard step={5} title="Sentinel Risk Check" icon={Shield}
            active={step === "sentinel"}
            completed={["executing", "complete"].includes(step)}>
            <SentinelAlert report={sentinelReport} />
          </StepCard>
        )}

        {/* Step 6 — Execution Result */}
        {tradeResult && step === "complete" && (
          <StepCard step={6} title="Execution Complete" icon={CheckCircle}
            active={false} completed>
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <CheckCircle size={16} className="text-emerald-400" />
                <span className="text-sm text-bloom-text font-semibold">
                  {tradeResult.orders.length} orders submitted to SoDEX Testnet
                </span>
                {(tradeResult as { simulated?: boolean }).simulated && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-amber-400 bg-amber-900/20 border-amber-800/30">
                    SIMULATED — no SODEX private key
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bloom-bg rounded-xl p-3 border border-bloom-border">
                  <p className="text-xs text-bloom-text-muted mb-1">Total Executed</p>
                  <p className="text-sm font-bold text-bloom-text">${tradeResult.totalExecutedUSD.toLocaleString()}</p>
                </div>
                <div className="bg-bloom-bg rounded-xl p-3 border border-bloom-border">
                  <p className="text-xs text-bloom-text-muted mb-1">Orders</p>
                  <p className="text-sm font-bold text-bloom-text">{tradeResult.orders.length} filled</p>
                </div>
              </div>
              {tradeResult.orders.map((order) => (
                <div key={order.orderId}
                  className="flex items-center justify-between text-xs bg-bloom-bg border border-bloom-border rounded-xl px-3 py-2">
                  <span className="font-mono text-bloom-text-muted">{order.symbol}</span>
                  <span className={order.side === 1 ? "text-emerald-400" : "text-red-400"}>
                    {order.side === 1 ? "BUY" : "SELL"} {order.fillQuantity}
                  </span>
                  <span className="text-bloom-text">@ ${order.fillPrice.toLocaleString()}</span>
                  <span className="text-emerald-400">FILLED</span>
                </div>
              ))}
              {txHash && isOnChainTxHash(txHash) ? (
                <a
                  href={`${valueChainTestnet.blockExplorers.default.url}/tx/${txHash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-bloom-orange hover:underline mt-2">
                  <ExternalLink size={12} />
                  View on ValueChain Explorer
                </a>
              ) : tradeResult.orders.length > 0 ? (
                <a
                  href={SODEX_TESTNET_TRADE_URL}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-bloom-orange hover:underline mt-2">
                  <ExternalLink size={12} />
                  Verify on SoDEX Testnet (Trade History)
                </a>
              ) : null}
              <button onClick={reset} className="orange-btn-outline text-xs px-4 py-1.5 mt-2">
                New Trade
              </button>
            </div>
          </StepCard>
        )}

        {/* Blocked */}
        {step === "blocked" && sentinelReport && (
          <div className="glass-card border-red-800/30 p-5 flex items-start gap-3">
            <XCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Transaction Blocked by Sentinel</p>
              <p className="text-xs text-bloom-text-muted mb-3">
                One or more risk checks failed. Adjust your parameters and try again.
              </p>
              <button onClick={reset} className="text-xs text-bloom-orange hover:underline">→ Try again</button>
            </div>
          </div>
        )}
      </div>

      {/* Right — Auto-Copy + live order feed */}
      <div className="lg:col-span-1 space-y-5">
        <AutoCopyPanel />
        <OrderFeedPanel />
      </div>
    </div>
  );
}

// --- StepCard -----------------------------------------------------------------

function StepCard({
  step, title, icon: Icon, active, completed, disabled, forceShow, children,
}: {
  step: number; title: string;
  icon: React.FC<{ size: number; className?: string }>;
  active: boolean; completed: boolean; disabled?: boolean; forceShow?: boolean;
  children?: React.ReactNode;
}) {
  const showBody = forceShow || active || completed;
  return (
    <div className={`glass-card p-5 transition-all duration-300 ${
      active    ? "border-bloom-border-hover shadow-orange-glow" :
      completed ? "border-emerald-800/20" :
      disabled  ? "opacity-40" : ""
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
          completed ? "bg-emerald-900/30 border border-emerald-800/40 text-emerald-400" :
          active    ? "bg-bloom-orange-dim border border-bloom-border-hover text-bloom-orange" :
                      "bg-white/5 border border-bloom-border text-bloom-text-muted"
        }`}>
          {completed ? <CheckCircle size={14} /> : step}
        </div>
        <div className="flex items-center gap-2">
          <Icon size={14} className={active || forceShow ? "text-bloom-orange" : "text-bloom-text-muted"} />
          <span className={`text-sm font-semibold ${active || forceShow ? "text-bloom-text" : "text-bloom-text-muted"}`}>
            {title}
          </span>
        </div>
      </div>
      {showBody && children}
    </div>
  );
}
