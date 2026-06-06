"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useSignTypedData } from "wagmi";
import { injected } from "wagmi/connectors";
import { Wallet, Shield, Zap, CheckCircle, XCircle, Loader, ExternalLink } from "lucide-react";
import type { CopyTradeIntent, CopyTradeResult, SentinelReport } from "@bloom-ai/types";
import SentinelAlert from "./SentinelAlert";
import OrderFeedPanel from "./OrderFeedPanel";
import { valueChainTestnet } from "@/lib/wagmi";
import { VALUECHAIN_TESTNET, VALUECHAIN_WALLET_PARAMS } from "@/lib/valuechain";

type Step = "connect" | "configure" | "signing" | "sentinel" | "executing" | "complete" | "blocked";

// EIP-712 typed data for trade authorization
const AUTHORIZATION_TYPES = {
  CopyTradeAuth: [
    { name: "strategyId",     type: "string"  },
    { name: "allocationUSD",  type: "uint256" },
    { name: "maxSlippageBps", type: "uint256" },
    { name: "userAddress",    type: "address" },
    { name: "deadline",       type: "uint256" },
  ],
} as const;

const API = "";

export default function CopyTradeDashboard() {
  const searchParams = useSearchParams();
  const strategyId = searchParams?.get("strategy") ?? "ssi-mag7-003";

  // -- Wagmi hooks ------------------------------------------------------------
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signTypedDataAsync } = useSignTypedData();

  // -- Local state ------------------------------------------------------------
  const [step, setStep]                     = useState<Step>("connect");
  const [allocation, setAllocation]         = useState<number>(100);
  const [slippage, setSlippage]             = useState<number>(50); // bps
  const [sentinelReport, setSentinelReport] = useState<SentinelReport | null>(null);
  const [tradeResult, setTradeResult]       = useState<CopyTradeResult | null>(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [userSignature, setUserSignature]   = useState<string>("");
  const [txHash, setTxHash]                 = useState<string>("");
  const [usdcBalance, setUsdcBalance]       = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [execError, setExecError]           = useState<string | null>(null);

  // If wallet connects externally, advance step + fetch balance
  useEffect(() => {
    if (isConnected && step === "connect") {
      setStep("configure");
      if (address) fetchAccountBalance(address);
    }
    if (!isConnected) {
      setStep("connect");
      setUsdcBalance(null);
    }
  }, [isConnected, step, address]);

  // Fetch real USDC balance from SoDEX account state
  const fetchAccountBalance = async (addr: string) => {
    setBalanceLoading(true);
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

  // -- Step: Sign trade authorization with MetaMask ---------------------------
  const signAuthorization = async () => {
    if (!address) return;
    setIsLoading(true);
    setStep("signing");

    // Ensure MetaMask is on the right chain before signing
    const TARGET_CHAIN_ID = VALUECHAIN_TESTNET.chainId;
    const TARGET_CHAIN_HEX = VALUECHAIN_TESTNET.chainIdHex;

    if (!window.ethereum) {
      alert("MetaMask not detected.");
      setStep("configure");
      setIsLoading(false);
      return;
    }

    const eth = window.ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

    // Try to switch; if not added, add it
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
        // User rejected switch
        setStep("configure");
        setIsLoading(false);
        return;
      }
    }

    // Verify the active chain is now correct
    const currentChainId = await eth.request({ method: "eth_chainId" }) as string;
    if (parseInt(currentChainId, 16) !== TARGET_CHAIN_ID) {
      alert(`Please switch MetaMask to ValueChain Testnet (Chain ID ${TARGET_CHAIN_ID}) before signing.`);
      setStep("configure");
      setIsLoading(false);
      return;
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

    try {
      const sig = await signTypedDataAsync({
        domain: {
          name:    "Bloom AI",
          version: "1",
          chainId: TARGET_CHAIN_ID,
        },
        types: AUTHORIZATION_TYPES,
        primaryType: "CopyTradeAuth",
        message: {
          strategyId,
          allocationUSD:  BigInt(Math.round(allocation)),
          maxSlippageBps: BigInt(slippage),
          userAddress:    address,
          deadline,
        },
      });

      setUserSignature(sig);
      await runSentinelAndExecute(sig);
    } catch (err) {
      // User rejected signing or chain mismatch
      const msg = String((err as Error)?.message ?? err);
      if (msg.includes("ChainMismatch") || msg.includes("chain")) {
        alert("Chain mismatch detected. Please disconnect your wallet, refresh the page, and reconnect.");
      }
      console.error("Signing rejected", err);
      setStep("configure");
    } finally {
      setIsLoading(false);
    }
  };

  // -- Step: Sentinel + Execute -----------------------------------------------
  const runSentinelAndExecute = async (sig: string) => {
    setIsLoading(true);
    setExecError(null);
    setStep("sentinel");

    const intent: CopyTradeIntent = {
      strategyId,
      newsletterId:   "nl-latest",
      userAddress:    address ?? "0x0000000000000000000000000000000000000000",
      allocationUSD:  allocation,
      maxSlippageBps: slippage,
    };

    let report: SentinelReport;
    try {
      const res  = await fetch(`${API}/api/sentinel/check`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(intent),
      });
      if (!res.ok) {
        throw new Error("Sentinel check failed — API offline");
      }
      const json = await res.json();
      report = json?.data ?? json;
      if (!report?.checks) {
        throw new Error("Invalid sentinel response");
      }
    } catch (err) {
      setExecError((err as Error).message);
      setStep("configure");
      setIsLoading(false);
      return;
    }

    setSentinelReport(report);

    if (!report.passed) {
      setStep("blocked");
      setIsLoading(false);
      return;
    }

    setStep("executing");
    try {
      const res = await fetch(`${API}/api/broker/execute`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...intent, userSignature: sig }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error((errJson as { error?: string }).error ?? "Execution failed — broker offline");
      }
      const json = await res.json();
      const result: CopyTradeResult = json?.data ?? json;
      if (!result?.orders) {
        throw new Error("Invalid execution response");
      }
      setTradeResult(result);
      setTxHash(result.orders[0]?.orderId ? `0x${result.orders[0].orderId.slice(0, 64)}` : "");
      setStep("complete");
    } catch (err) {
      setExecError((err as Error).message);
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

        {/* Step 1 — Connect Wallet */}
        <StepCard step={1} title="Connect Wallet" icon={Wallet}
          active={step === "connect"} completed={step !== "connect"}>
          {step === "connect" ? (
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

        {/* Step 2 — Configure */}
        <StepCard step={2} title="Configure Strategy" icon={Zap}
          active={step === "configure"}
          completed={["signing", "sentinel", "executing", "complete", "blocked"].includes(step)}
          disabled={step === "connect"}>
          {step === "configure" && (
            <div className="space-y-5">
              <div className="glass-card p-4 border-bloom-border-hover">
                <p className="text-xs text-bloom-text-muted mb-1 uppercase tracking-wider font-semibold">Strategy</p>
                <p className="text-sm font-bold text-bloom-orange">{strategyId.toUpperCase()}</p>
              </div>
              {/* Kelly Criterion optimal allocation */}
              {(() => {
                const WIN_RATE = 0.68;
                const WIN_LOSS_RATIO = 1.4;
                const kellyFraction = WIN_RATE - (1 - WIN_RATE) / WIN_LOSS_RATIO;
                const kellyPct = Math.round(kellyFraction * 100);
                const kellyUSD = usdcBalance ? Math.round(kellyFraction * usdcBalance) : null;
                const overKelly = allocation > (kellyUSD ?? Infinity);
                return (
                  <div className="glass-card p-4 border border-bloom-border-hover bg-gradient-to-br from-amber-950/20 to-bloom-bg-2/60">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-bloom-text-muted uppercase tracking-wider">Kelly Criterion</p>
                      <span className="text-xs px-2 py-0.5 rounded-full border border-amber-700/40 bg-amber-900/20 text-amber-400 font-mono font-bold">{kellyPct}% optimal</span>
                    </div>
                    <p className="text-xs font-mono text-bloom-text-muted mb-1">
                      f* = W − (1−W)/R = {WIN_RATE} − {(1-WIN_RATE).toFixed(2)}/{WIN_LOSS_RATIO} = <span className="text-amber-400 font-bold">{kellyFraction.toFixed(3)}</span>
                    </p>
                    <p className="text-xs text-bloom-text-muted">Win rate <span className="text-bloom-text font-semibold">68%</span> · avg win/loss ratio <span className="text-bloom-text font-semibold">1.4×</span></p>
                    {kellyUSD !== null && (
                      <p className="text-xs text-bloom-text-muted mt-1">Kelly-optimal on your balance: <span className="text-amber-400 font-bold">${kellyUSD.toLocaleString()}</span></p>
                    )}
                    {overKelly && (
                      <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                        <span>⚠</span> Above Kelly-optimal — consider reducing for risk-adjusted returns
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* USDC Balance from SoDEX */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-bloom-text-muted font-semibold uppercase tracking-wider">SoDEX USDC Balance</span>
                {balanceLoading ? (
                  <span className="text-bloom-text-muted animate-pulse">Loading...</span>
                ) : usdcBalance !== null ? (
                  <span className={`font-bold ${usdcBalance < allocation ? "text-red-400" : "text-emerald-400"}`}>
                    ${usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    {usdcBalance < allocation && " (insufficient)"}
                  </span>
                ) : (
                  <span className="text-bloom-text-muted">No SoDEX account yet</span>
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
              {usdcBalance !== null && usdcBalance < allocation && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                  Insufficient USDC balance. Reduce allocation or deposit USDC to SoDEX.
                </div>
              )}
              {execError && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                  {execError}
                </div>
              )}
              <button onClick={signAuthorization}
                disabled={isLoading || (usdcBalance !== null && usdcBalance < allocation)}
                className="orange-btn flex items-center gap-2 text-sm disabled:opacity-50">
                <Shield size={14} />
                Sign & Execute via MetaMask
              </button>
            </div>
          )}
          {["signing", "sentinel", "executing", "complete", "blocked"].includes(step) && (
            <p className="text-xs text-bloom-text-muted">
              ${allocation.toLocaleString()} → <span className="text-bloom-orange">{strategyId.toUpperCase()}</span> · Max slippage {(slippage / 100).toFixed(2)}%
            </p>
          )}
        </StepCard>

        {/* Step 3 — Signing */}
        {["signing", "sentinel", "executing", "complete"].includes(step) && (
          <StepCard step={3} title="EIP-712 Wallet Signature" icon={Shield}
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

        {/* Step 4 — Sentinel */}
        {sentinelReport && (
          <StepCard step={4} title="Sentinel Risk Check" icon={Shield}
            active={step === "sentinel"}
            completed={["executing", "complete"].includes(step)}>
            <SentinelAlert report={sentinelReport} />
          </StepCard>
        )}

        {/* Step 5 — Execution Result */}
        {tradeResult && step === "complete" && (
          <StepCard step={5} title="Execution Complete" icon={CheckCircle}
            active={false} completed>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-400" />
                <span className="text-sm text-bloom-text font-semibold">
                  {tradeResult.orders.length} orders filled on SoDEX Testnet
                </span>
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
              {txHash && (
                <a
                  href={`${valueChainTestnet.blockExplorers.default.url}/tx/${txHash}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-bloom-orange hover:underline mt-2">
                  <ExternalLink size={12} />
                  View on ValueChain Explorer
                </a>
              )}
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

      {/* Right — live order feed */}
      <div className="lg:col-span-1">
        <OrderFeedPanel />
      </div>
    </div>
  );
}

// --- StepCard -----------------------------------------------------------------

function StepCard({
  step, title, icon: Icon, active, completed, disabled, children,
}: {
  step: number; title: string;
  icon: React.FC<{ size: number; className?: string }>;
  active: boolean; completed: boolean; disabled?: boolean; children?: React.ReactNode;
}) {
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
          <Icon size={14} className={active ? "text-bloom-orange" : "text-bloom-text-muted"} />
          <span className={`text-sm font-semibold ${active ? "text-bloom-text" : "text-bloom-text-muted"}`}>
            {title}
          </span>
        </div>
      </div>
      {(active || completed) && children}
    </div>
  );
}
