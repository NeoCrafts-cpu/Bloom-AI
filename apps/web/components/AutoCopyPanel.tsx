"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { Bot, Loader, Power, RefreshCw, Shield } from "lucide-react";
import type { AutoCopyRun, AutoCopySubscription } from "@bloom-ai/types";
import { VALUECHAIN_TESTNET } from "@/lib/valuechain";

const AUTO_COPY_TYPES = {
  AutoCopyGrant: [
    { name: "userAddress", type: "address" },
    { name: "maxAllocationUSD", type: "uint256" },
    { name: "maxDailyUSD", type: "uint256" },
    { name: "maxSlippageBps", type: "uint256" },
    { name: "venue", type: "string" },
    { name: "expiresAt", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AutoCopyPanel() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [sub, setSub] = useState<AutoCopySubscription | null>(null);
  const [runs, setRuns] = useState<AutoCopyRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allocation, setAllocation] = useState(40);
  const [maxDaily, setMaxDaily] = useState(200);
  const [slippage, setSlippage] = useState(50);
  const [days, setDays] = useState(7);

  const refresh = useCallback(async () => {
    if (!address) {
      setSub(null);
      setRuns([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/auto-copy/${address}`);
      const json = await res.json();
      setSub(json?.data ?? null);
      setRuns(Array.isArray(json?.runs) ? json.runs : []);
      if (json?.data) {
        setAllocation(json.data.maxAllocationUSD);
        setMaxDaily(json.data.maxDailyUSD);
        setSlippage(json.data.maxSlippageBps);
      }
    } catch {
      setError("Failed to load Auto-Copy status");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = async () => {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
      const nonce = Date.now();
      const venue = "spot" as const;
      const message = {
        userAddress: address as `0x${string}`,
        maxAllocationUSD: BigInt(Math.round(allocation)),
        maxDailyUSD: BigInt(Math.round(maxDaily)),
        maxSlippageBps: BigInt(Math.round(slippage)),
        venue,
        expiresAt: BigInt(expiresAt),
        nonce: BigInt(nonce),
      };

      const signature = await signTypedDataAsync({
        domain: {
          name: "Bloom AI",
          version: "1",
          chainId: VALUECHAIN_TESTNET.chainId,
        },
        types: AUTO_COPY_TYPES,
        primaryType: "AutoCopyGrant",
        message,
      });

      const res = await fetch("/api/auto-copy/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: address,
          maxAllocationUSD: allocation,
          maxDailyUSD: maxDaily,
          maxSlippageBps: slippage,
          venue,
          expiresAt,
          nonce,
          signature,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Enable failed");
      setSub(json.data);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auto-copy/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: address }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Disable failed");
      setSub(json.data);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const active = Boolean(sub?.enabled);

  return (
    <div className={`glass-card p-5 ${active ? "border-bloom-border-hover shadow-orange-glow" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
            <Bot size={14} className="text-bloom-orange" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-bloom-text">Auto-Copy</h2>
            <p className="text-[11px] text-bloom-text-muted">
              Unattended copies still use the server SoDEX key. Manual Trade uses your own wallet balance.
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            active
              ? "text-emerald-400 bg-emerald-900/20 border-emerald-800/30"
              : "text-bloom-text-muted border-bloom-border"
          }`}
        >
          {loading ? "…" : active ? "ON" : "OFF"}
        </span>
      </div>

      {!isConnected ? (
        <p className="text-xs text-bloom-text-muted">Connect wallet to enable Auto-Copy.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-semibold text-bloom-text-muted uppercase tracking-wider">
                Per trade ($)
              </span>
              <input
                type="number"
                min={10}
                max={10000}
                value={allocation}
                disabled={busy || active}
                onChange={(e) => setAllocation(Number(e.target.value))}
                className="mt-1 w-full bg-bloom-bg border border-bloom-border rounded-xl px-3 py-2 text-sm text-bloom-text"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold text-bloom-text-muted uppercase tracking-wider">
                Daily max ($)
              </span>
              <input
                type="number"
                min={10}
                max={50000}
                value={maxDaily}
                disabled={busy || active}
                onChange={(e) => setMaxDaily(Number(e.target.value))}
                className="mt-1 w-full bg-bloom-bg border border-bloom-border rounded-xl px-3 py-2 text-sm text-bloom-text"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold text-bloom-text-muted uppercase tracking-wider">
                Max slip (bps)
              </span>
              <input
                type="number"
                min={10}
                max={200}
                value={slippage}
                disabled={busy || active}
                onChange={(e) => setSlippage(Number(e.target.value))}
                className="mt-1 w-full bg-bloom-bg border border-bloom-border rounded-xl px-3 py-2 text-sm text-bloom-text"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold text-bloom-text-muted uppercase tracking-wider">
                Grant days
              </span>
              <input
                type="number"
                min={1}
                max={30}
                value={days}
                disabled={busy || active}
                onChange={(e) => setDays(Number(e.target.value))}
                className="mt-1 w-full bg-bloom-bg border border-bloom-border rounded-xl px-3 py-2 text-sm text-bloom-text"
              />
            </label>
          </div>

          {active && sub && (
            <div className="rounded-xl border border-bloom-border bg-bloom-bg/50 p-3 text-xs text-bloom-text-muted space-y-1">
              <p>
                Spent today:{" "}
                <span className="text-bloom-text font-semibold">
                  ${sub.spentTodayUSD.toLocaleString()} / ${sub.maxDailyUSD.toLocaleString()}
                </span>
              </p>
              <p>
                Grant expires:{" "}
                <span className="text-bloom-text">
                  {new Date(sub.grantExpiresAt * 1000).toLocaleString()}
                </span>
              </p>
              {sub.lastRunAt && (
                <p>
                  Last run: {timeAgo(sub.lastRunAt)} —{" "}
                  <span className="text-bloom-orange">{sub.lastResult ?? "—"}</span>
                  {sub.lastError ? ` · ${sub.lastError}` : ""}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-bloom-text-muted">
            <Shield size={12} className="text-bloom-orange shrink-0" />
            EIP-712 grant + Sentinel on every trade. Cancel-only legs are skipped automatically.
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!active ? (
              <button
                type="button"
                onClick={enable}
                disabled={busy || allocation > maxDaily}
                className="orange-btn flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-50"
              >
                {busy ? <Loader size={14} className="animate-spin" /> : <Power size={14} />}
                Sign & Enable Auto-Copy
              </button>
            ) : (
              <button
                type="button"
                onClick={disable}
                disabled={busy}
                className="orange-btn-outline flex items-center gap-2 text-sm px-4 py-2"
              >
                {busy ? <Loader size={14} className="animate-spin" /> : <Power size={14} />}
                Disable
              </button>
            )}
            <button
              type="button"
              onClick={refresh}
              className="text-xs text-bloom-text-muted hover:text-bloom-orange flex items-center gap-1 px-2"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {runs.length > 0 && (
            <div className="border-t border-bloom-border pt-3">
              <p className="text-[10px] font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
                Recent Auto-Copy runs
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {runs.slice(0, 8).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 text-[11px] text-bloom-text-muted"
                  >
                    <span className="truncate">
                      <code className="text-bloom-orange">{r.strategyId.slice(0, 12)}</code> · {r.message}
                    </span>
                    <span
                      className={
                        r.status === "executed"
                          ? "text-emerald-400"
                          : r.status === "blocked"
                            ? "text-amber-400"
                            : r.status === "error"
                              ? "text-red-400"
                              : ""
                      }
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
