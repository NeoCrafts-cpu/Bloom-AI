"use client";

import { Suspense } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus, Trash2, Save, AlertCircle, Layers, Search, ExternalLink,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import type { SSIAssetWeight, SSIIndex } from "@bloom-ai/types";

const DEFAULT_ASSETS = ["BTC", "ETH", "SOL", "BNB", "AVAX", "ARB", "OP", "LINK", "USDC"];

interface DraftAsset extends SSIAssetWeight {
  id: string;
}

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit");

  const [name, setName] = useState("BLOOM-CUSTOM");
  const [description, setDescription] = useState("");
  const [assets, setAssets] = useState<DraftAsset[]>([
    { id: "1", symbol: "BTC", address: "0x1", weight: 0.5, currentPrice: 0 },
    { id: "2", symbol: "ETH", address: "0x2", weight: 0.5, currentPrice: 0 },
  ]);
  const [search, setSearch] = useState("");
  const [tradability, setTradability] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const weightSum = assets.reduce((s, a) => s + a.weight, 0);
  const weightPct = Math.round(weightSum * 100);

  const loadExisting = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/strategies/${id}`);
      if (!res.ok) return;
      const json = await res.json();
      const s: SSIIndex = json?.data?.strategy;
      if (!s) return;
      setName(s.name);
      setDescription(s.description);
      setAssets(s.assets.map((a, i) => ({ ...a, id: String(i) })));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (editId) loadExisting(editId);
  }, [editId, loadExisting]);

  useEffect(() => {
    fetch("/api/strategies/ssi-mag7-003")
      .then((r) => r.json())
      .then((j) => {
        const t = j?.data?.tradability;
        if (t && typeof t === "object") setTradability(t);
      })
      .catch(() => {});
  }, []);

  const addAsset = (symbol: string) => {
    if (assets.some((a) => a.symbol === symbol)) return;
    setAssets((prev) => [
      ...prev,
      { id: String(Date.now()), symbol, address: "0x0", weight: 0, currentPrice: 0 },
    ]);
  };

  const removeAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const updateWeight = (id: string, pct: number) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, weight: pct / 100 } : a)),
    );
  };

  const validate = (): boolean => {
    if (!name.trim()) {
      setValidationError("Name is required");
      return false;
    }
    if (assets.length === 0) {
      setValidationError("Add at least one asset");
      return false;
    }
    if (Math.abs(weightSum - 1) > 0.01) {
      setValidationError(`Weights must sum to 100% (currently ${weightPct}%)`);
      return false;
    }
    setValidationError(null);
    return true;
  };

  const saveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        description,
        assets: assets.map(({ symbol, address, weight, currentPrice }) => ({
          symbol, address, weight, currentPrice,
        })),
        status: "draft" as const,
      };

      const res = editId
        ? await fetch(`/api/strategies/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/strategies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error ?? "Save failed");
      }
      const json = await res.json();
      const saved: SSIIndex = json?.data;
      router.push(`/strategies/${saved.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const filteredSymbols = DEFAULT_ASSETS.filter(
    (s) => s.includes(search.toUpperCase()) && !assets.some((a) => a.symbol === s),
  );

  return (
    <div className="min-h-screen bg-bloom-bg">
      <Navbar />
      <main className="pt-24 pb-10 px-4 md:px-6 max-w-[1200px] mx-auto">
        <div className="mb-6">
          <div className="pill-badge-orange w-fit mb-2">
            <Layers size={10} />
            Off-Chain Studio
          </div>
          <h1 className="text-2xl font-bold text-bloom-text">
            Index Publisher <span className="orange-gradient-text">Studio</span>
          </h1>
          <p className="text-sm text-bloom-text-muted mt-0.5">
            Compose BLOOM index strategies with SoSoValue evidence · On-chain SSI publishing pending API integration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-bloom-text-muted uppercase tracking-wider">Index Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 bg-bloom-bg border border-bloom-border rounded-xl px-4 py-2.5 text-sm text-bloom-text focus:border-bloom-orange outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-bloom-text-muted uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full mt-1 bg-bloom-bg border border-bloom-border rounded-xl px-4 py-2.5 text-sm text-bloom-text focus:border-bloom-orange outline-none resize-none"
                />
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-bloom-text">Composition</h2>
                <span className={`text-xs font-bold ${Math.abs(weightSum - 1) <= 0.01 ? "text-emerald-400" : "text-red-400"}`}>
                  Total: {weightPct}%
                </span>
              </div>

              <div className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-bloom-orange w-14">{asset.symbol}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(asset.weight * 100)}
                      onChange={(e) => updateWeight(asset.id, Number(e.target.value))}
                      className="flex-1 accent-bloom-orange"
                    />
                    <span className="text-sm font-mono text-bloom-text w-12 text-right">
                      {Math.round(asset.weight * 100)}%
                    </span>
                    {tradability[asset.symbol] === false && (
                      <span className="text-[10px] text-amber-400 shrink-0">Watch only</span>
                    )}
                    <button onClick={() => removeAsset(asset.id)} className="text-bloom-text-muted hover:text-red-400 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {validationError && (
                <p className="text-xs text-red-400 mt-3 flex items-center gap-1">
                  <AlertCircle size={12} /> {validationError}
                </p>
              )}
            </div>

            {error && (
              <div className="glass-card p-4 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              onClick={saveDraft}
              disabled={saving}
              className="orange-btn flex items-center gap-2 px-6 py-2.5 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Saving…" : editId ? "Update Draft" : "Save Draft"}
            </button>
          </div>

          <div className="space-y-4">
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-bloom-text mb-3 flex items-center gap-2">
                <Search size={14} className="text-bloom-orange" />
                Add Asset
              </h3>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbols…"
                className="w-full bg-bloom-bg border border-bloom-border rounded-xl px-3 py-2 text-xs text-bloom-text focus:border-bloom-orange outline-none mb-3"
              />
              <div className="flex flex-wrap gap-1.5">
                {filteredSymbols.map((s) => (
                  <button
                    key={s}
                    onClick={() => addAsset(s)}
                    className="pill-badge text-xs hover:bg-bloom-orange-dim flex items-center gap-1"
                  >
                    <Plus size={10} /> {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-bloom-text mb-2">Evidence Panel</h3>
              <p className="text-xs text-bloom-text-muted leading-relaxed mb-3">
                Weights are validated server-side. Non-tradable assets are allowed for research but blocked from copy-trade execution.
              </p>
              <Link href="/research" className="text-xs text-bloom-orange hover:underline flex items-center gap-1">
                Research data <ExternalLink size={10} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bloom-bg" />}>
      <StudioContent />
    </Suspense>
  );
}
