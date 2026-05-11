"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { DollarSign, Users, Calendar, TrendingUp, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Investor {
  name: string;
  logo_url?: string;
  is_lead_investor: boolean;
}

interface FundingRound {
  round_id: string;
  round: string;
  amount: string;
  valuation: string | null;
  date: number;
  investors: Investor[];
}

interface FundraisingData {
  fundraising_rounds: FundingRound[];
  investment_stats: {
    total_rounds: number;
    rounds_last_year: number;
    lead_invest_count: number;
    last_invest_date: number | null;
  };
}

const COINS = ["BTC", "ETH", "SOL"] as const;
type Coin = (typeof COINS)[number];

const ROUND_COLORS: Record<string, string> = {
  "seed": "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  "series a": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "series b": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "series c": "bg-pink-500/15 text-pink-400 border-pink-500/20",
  "strategic": "bg-bloom-orange/15 text-bloom-orange border-bloom-orange/20",
  "private": "bg-green-500/15 text-green-400 border-green-500/20",
};

function getRoundStyle(round: string) {
  return ROUND_COLORS[round.toLowerCase()] ?? "bg-bloom-card-hover text-bloom-text-muted border-bloom-border";
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

export default function VCFundingPanel() {
  const [coin, setCoin]       = useState<Coin>("ETH");
  const [data, setData]       = useState<FundraisingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchFunding = useCallback(async (c: Coin) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res  = await fetch(`/api/market/fundraising/${c}`);
      const json = await res.json();
      if (res.status === 404) { setError("Fundraising data not found in SoSoValue"); return; }
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setData(json?.data ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFunding(coin); }, [coin, fetchFunding]);

  const rounds = data?.fundraising_rounds ?? [];
  const stats  = data?.investment_stats;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-bloom-orange-dim border border-bloom-border-hover flex items-center justify-center">
            <DollarSign size={14} className="text-bloom-orange" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-bloom-text">VC Funding Intel</h3>
            <p className="text-xs text-bloom-text-muted">Fundraising rounds · SoSoValue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {COINS.map((c) => (
            <button
              key={c}
              onClick={() => setCoin(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                coin === c
                  ? "bg-bloom-orange text-black"
                  : "bg-bloom-card-hover text-bloom-text-muted hover:text-bloom-text"
              }`}
            >
              {c}
            </button>
          ))}
          <button onClick={() => fetchFunding(coin)} className="p-1.5 rounded-lg hover:bg-bloom-card-hover text-bloom-text-muted">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Total Rounds", val: stats.total_rounds },
            { label: "Last Year", val: stats.rounds_last_year },
            { label: "Lead Investors", val: stats.lead_invest_count },
          ].map(({ label, val }) => (
            <div key={label} className="bg-bloom-card-hover rounded-xl p-2.5 text-center">
              <p className="text-[9px] text-bloom-text-muted uppercase tracking-wide">{label}</p>
              <p className="text-base font-bold text-bloom-text">{val}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-bloom-card-hover rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="h-24 flex items-center justify-center text-xs text-bloom-text-muted">{error}</div>
      ) : rounds.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-xs text-bloom-text-muted">No funding rounds found</div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 bloom-scroll">
          {rounds.map((r) => {
            const isOpen = expanded === r.round_id;
            return (
              <motion.div key={r.round_id} className="bg-bloom-card-hover rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : r.round_id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-bloom-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRoundStyle(r.round)}`}>
                      {r.round}
                    </span>
                    <span className="text-xs font-bold text-bloom-text">{r.amount || "Undisclosed"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-bloom-text-muted flex items-center gap-1">
                      <Calendar size={9} />
                      {fmtDate(r.date)}
                    </span>
                    <span className="text-[10px] text-bloom-text-muted flex items-center gap-1">
                      <Users size={9} />
                      {r.investors.length}
                    </span>
                    {isOpen ? <ChevronUp size={12} className="text-bloom-text-muted" /> : <ChevronDown size={12} className="text-bloom-text-muted" />}
                  </div>
                </button>

                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-3 pb-3"
                  >
                    {r.valuation && (
                      <p className="text-[10px] text-bloom-text-muted mb-2">Valuation: {r.valuation}</p>
                    )}
                    {r.investors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {r.investors.map((inv) => (
                          <div
                            key={inv.name}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${
                              inv.is_lead_investor
                                ? "bg-bloom-orange/15 text-bloom-orange border border-bloom-orange/20"
                                : "bg-bloom-card text-bloom-text-muted"
                            }`}
                          >
                            {inv.logo_url && (
                              <img src={inv.logo_url} alt={inv.name} className="w-3 h-3 rounded-full object-cover" />
                            )}
                            {inv.name}
                            {inv.is_lead_investor && <span className="text-[8px]">★ Lead</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
