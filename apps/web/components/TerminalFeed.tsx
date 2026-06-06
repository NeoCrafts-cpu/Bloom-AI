"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { SmartMoneyNewsletter } from "@bloom-ai/types";
import { getApiBaseUrl } from "@/lib/api";

const NARRATIVE_COLORS = {
  "risk-on": "text-emerald-400 bg-emerald-900/20 border-emerald-800/30",
  "risk-off": "text-red-400 bg-red-900/20 border-red-800/30",
  neutral: "text-bloom-text-muted bg-white/5 border-bloom-border",
  rotation: "text-amber-400 bg-amber-900/20 border-amber-800/30",
};

const NARRATIVE_LABELS = {
  "risk-on": "Risk On",
  "risk-off": "Risk Off",
  neutral: "Neutral",
  rotation: "Rotation",
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function TerminalFeed() {
  const [newsletters, setNewsletters] = useState<SmartMoneyNewsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SmartMoneyNewsletter | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNewsletters = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/newsletters?limit=20");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          setNewsletters(list);
          setIsDemo(false);
          setLoadError(list.length === 0 ? "No newsletters yet — run the Journalist agent" : null);
          if (list.length > 0) setLastUpdate(new Date());
        } else {
          setLoadError("Newsletter feed offline");
        }
      } catch {
        setLoadError("Newsletter feed offline");
      } finally {
        setLoading(false);
      }
    };

    fetchNewsletters();

    const apiUrl = getApiBaseUrl();
    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource(`${apiUrl || ""}/api/newsletters/stream`);
      evtSource.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Handle initial bulk load from SSE
          if (msg.type === "INITIAL" && Array.isArray(msg.data)) {
            setNewsletters(msg.data);
            setIsDemo(false);
            setLastUpdate(new Date());
          } else if (msg.type === "JOURNALIST_PUBLISHED" && msg.payload) {
              setNewsletters((prev) => [msg.payload, ...prev.slice(0, 19)]);
              setIsDemo(false);
              setLastUpdate(new Date());
            }
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // SSE not available
    }

    return () => {
      evtSource?.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-6 h-36 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Feed list */}
      <div className="lg:col-span-2 space-y-4">
        {/* Feed header */}
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            loadError
              ? "text-amber-400 bg-amber-900/20 border-amber-800/30"
              : isDemo
              ? "text-amber-400 bg-amber-900/20 border-amber-800/30"
              : "text-emerald-400 bg-emerald-900/20 border-emerald-800/30"
          }`}>
            {loadError ? loadError : isDemo ? "Demo sample" : "LIVE · Journalist Agent"}
          </span>
          {!isDemo && lastUpdate && (
            <span className="text-[10px] text-bloom-text-muted">
              Updated {Math.floor((Date.now() - lastUpdate.getTime()) / 60000)}m ago
            </span>
          )}
        </div>
        <AnimatePresence initial={false}>
          {newsletters.length === 0 && !loading ? (
            <div className="glass-card p-8 text-center text-sm text-bloom-text-muted">
              {loadError ?? "No newsletters published yet"}
            </div>
          ) : (
          newsletters.map((nl, i) => (
            <motion.div
              key={nl.id}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.35, delay: i < 3 ? i * 0.08 : 0, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <NewsletterCard
                newsletter={nl}
                active={selected?.id === nl.id}
                onClick={() => setSelected(nl)}
              />
            </motion.div>
          ))
          )}
        </AnimatePresence>
      </div>

      {/* Detail panel */}
      <div className="lg:col-span-1">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <NewsletterDetail newsletter={selected} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-8 text-center text-bloom-text-muted text-sm flex flex-col items-center gap-3 h-64 justify-center"
            >
              <TrendingUp size={32} className="text-bloom-border" />
              <p>Select a newsletter to view details and copy the strategy</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NewsletterCard({
  newsletter,
  active,
  onClick,
}: {
  newsletter: SmartMoneyNewsletter;
  active: boolean;
  onClick: () => void;
}) {
  const nc = NARRATIVE_COLORS[newsletter.narrative];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left glass-card p-5 transition-all duration-200 hover:border-bloom-border-hover hover:shadow-orange-glow ${
        active ? "border-bloom-border-hover shadow-orange-glow" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${nc}`}
        >
          {newsletter.narrative === "risk-on" ? (
            <TrendingUp size={10} />
          ) : (
            <TrendingDown size={10} />
          )}
          {NARRATIVE_LABELS[newsletter.narrative]}
        </span>
        <span className="flex items-center gap-1 text-xs text-bloom-text-muted shrink-0">
          <Clock size={10} />
          {timeAgo(newsletter.publishedAt)}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-bloom-text mb-2 line-clamp-2">
        {newsletter.title}
      </h3>

      <p className="text-xs text-bloom-text-muted leading-relaxed line-clamp-2">
        {newsletter.summary}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {newsletter.keyAssets.slice(0, 4).map((asset) => (
          <span key={asset} className="pill-badge text-xs">
            {asset}
          </span>
        ))}
      </div>
    </button>
  );
}

function NewsletterDetail({ newsletter }: { newsletter: SmartMoneyNewsletter }) {
  const nc = NARRATIVE_COLORS[newsletter.narrative];

  return (
    <div className="glass-card p-6 sticky top-24">
      <div className="flex items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${nc}`}>
          {NARRATIVE_LABELS[newsletter.narrative]}
        </span>
        <span className="text-xs text-bloom-text-muted">
          {timeAgo(newsletter.publishedAt)}
        </span>
      </div>

      <h3 className="text-base font-bold text-bloom-text mb-3">
        {newsletter.title}
      </h3>

      <p className="text-sm text-bloom-text-muted leading-relaxed mb-5">
        {newsletter.summary}
      </p>

      {/* ETF Flows */}
      {newsletter.etfFlows.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
            ETF Flow Signals
          </p>
          <div className="space-y-2">
            {newsletter.etfFlows.map((flow) => (
              <div
                key={flow.ticker}
                className="flex items-center justify-between text-xs bg-bloom-bg rounded-xl px-3 py-2 border border-bloom-border"
              >
                <span className="font-mono font-semibold text-bloom-text">
                  {flow.ticker}
                </span>
                <span
                  className={
                    flow.netInflow >= 0 ? "text-emerald-400" : "text-red-400"
                  }
                >
                  {flow.netInflow >= 0 ? "+" : ""}
                  ${(Math.abs(flow.netInflow) / 1e6).toFixed(0)}M
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key assets */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-bloom-text-muted uppercase tracking-wider mb-2">
          Key Assets
        </p>
        <div className="flex flex-wrap gap-1.5">
          {newsletter.keyAssets.map((asset) => (
            <span key={asset} className="pill-badge-orange text-xs">
              {asset}
            </span>
          ))}
        </div>
      </div>

      {/* Copy Strategy CTA */}
      {newsletter.strategyId ? (
        <Link
          href={`/copy-trade?strategy=${newsletter.strategyId}`}
          className="orange-btn flex items-center justify-center gap-2 w-full text-sm"
        >
          Copy Strategy On-Chain
          <ExternalLink size={14} />
        </Link>
      ) : (
        <p className="text-xs text-bloom-text-muted text-center py-3">
          Strategy index pending Strategist agent...
        </p>
      )}
    </div>
  );
}
