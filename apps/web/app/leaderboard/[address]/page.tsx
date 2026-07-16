"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function ProfilePage() {
  const params = useParams();
  const address = params?.address as string;
  const [profile, setProfile] = useState<{
    userAddress: string;
    trades: number;
    notionalUSD: number;
    liveTrades: number;
    simulatedTrades: number;
    strategies: { id: string; name: string; symbol: string }[];
  } | null>(null);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/social/profiles/${address}`)
      .then((r) => r.json())
      .then((j) => setProfile(j?.data ?? null))
      .catch(() => setProfile(null));
  }, [address]);

  return (
    <div className="min-h-screen bg-bloom-bg">
      <Navbar />
      <main className="pt-28 pb-12 px-4 max-w-3xl mx-auto">
        <Link href="/leaderboard" className="text-xs text-bloom-orange hover:underline">← Leaderboard</Link>
        <h1 className="text-2xl font-bold text-bloom-text mt-3 mb-1">Copy Profile</h1>
        <p className="font-mono text-xs text-bloom-text-muted mb-6">{address}</p>
        {!profile ? (
          <p className="text-sm text-bloom-text-muted">Loading or empty profile…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Trades", value: profile.trades },
                { label: "Notional", value: `$${profile.notionalUSD.toLocaleString()}` },
                { label: "Live", value: profile.liveTrades },
                { label: "Simulated", value: profile.simulatedTrades },
              ].map((k) => (
                <div key={k.label} className="glass-card p-4">
                  <p className="text-[10px] text-bloom-text-muted uppercase">{k.label}</p>
                  <p className="text-lg font-bold text-bloom-text mt-1">{k.value}</p>
                </div>
              ))}
            </div>
            <div className="glass-card p-5">
              <h2 className="text-sm font-bold text-bloom-text mb-3">Copied Strategies</h2>
              {profile.strategies.length === 0 ? (
                <p className="text-xs text-bloom-text-muted">None yet</p>
              ) : (
                <div className="space-y-2">
                  {profile.strategies.map((s) => (
                    <Link key={s.id} href={`/strategies/${s.id}`} className="block border border-bloom-border rounded-xl px-3 py-2 hover:border-bloom-border-hover">
                      <p className="text-sm font-semibold text-bloom-text">{s.name}</p>
                      <p className="text-[10px] font-mono text-bloom-orange">{s.symbol}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
