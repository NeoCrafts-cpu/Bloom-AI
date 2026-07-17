"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";

interface Row {
  userAddress: string;
  trades: number;
  notionalUSD: number;
  liveTrades: number;
  strategyCount: number;
  verified: boolean;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/social/leaderboard")
      .then((r) => r.json())
      .then((j) => setRows(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bloom-bg">
      <Navbar />
      <main className="pt-24 pb-12 px-4 max-w-4xl mx-auto">
        <PageHeader
          eyebrow="Social"
          title={
            <>
              Copy <span className="orange-gradient-text">Leaderboard</span>
            </>
          }
          subtitle="Ranked by verified executed notional — no fabricated win rates."
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-bloom-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="glass-card p-10 text-center text-sm text-bloom-text-muted">
            No verified copy traders yet — complete a pipeline copy-trade to appear here.
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-bloom-text-muted border-b border-bloom-border">
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Wallet</th>
                  <th className="p-3 text-right">Notional</th>
                  <th className="p-3 text-right hidden sm:table-cell">Trades</th>
                  <th className="p-3 text-right hidden md:table-cell">Live</th>
                  <th className="p-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.userAddress} className="border-b border-bloom-border/50">
                    <td className="p-3 text-bloom-text-muted">{i + 1}</td>
                    <td className="p-3 font-mono text-xs text-bloom-text">
                      {r.userAddress.slice(0, 6)}…{r.userAddress.slice(-4)}
                      {r.verified && <span className="ml-2 text-[10px] text-emerald-400">LIVE</span>}
                    </td>
                    <td className="p-3 text-right font-mono text-bloom-orange">${r.notionalUSD.toLocaleString()}</td>
                    <td className="p-3 text-right hidden sm:table-cell">{r.trades}</td>
                    <td className="p-3 text-right hidden md:table-cell">{r.liveTrades}</td>
                    <td className="p-3 text-right">
                      <Link href={`/leaderboard/${r.userAddress}`} className="text-bloom-orange inline-flex items-center gap-1 text-xs">
                        View <ExternalLink size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
