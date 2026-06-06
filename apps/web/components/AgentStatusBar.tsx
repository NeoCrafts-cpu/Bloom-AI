"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Brain, Layers, Zap, Shield, LineChart, Play, ChevronRight, RefreshCw } from "lucide-react";
import type { AgentState } from "@bloom-ai/types";

const PIPELINE_ORDER = ["journalist", "chartanalyst", "strategist", "broker", "sentinel"] as const;

const AGENT_CONFIG: Record<string, { icon: React.ElementType; label: string; description: string }> = {
  journalist:   { icon: Brain,     label: "Journalist",    description: "Reads SoSoValue ETF flows & news" },
  chartanalyst: { icon: LineChart,  label: "Chart Analyst", description: "Analyzes SoDEX klines + RSI/SMA" },
  strategist:   { icon: Layers,    label: "Strategist",    description: "Generates SSI index from signals" },
  broker:       { icon: Zap,       label: "Broker",        description: "Executes on user confirmation" },
  sentinel:     { icon: Shield,    label: "Sentinel",      description: "Risk-checks all payloads live" },
};

const IDLE_INITIAL: AgentState[] = PIPELINE_ORDER.map((name) => ({
  name,
  status: "idle" as const,
  message: "Loading agent status…",
}));

export default function AgentStatusBar() {
  const [agents, setAgents]       = useState<AgentState[]>(IDLE_INITIAL);
  const [triggering, setTriggering] = useState(false);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : null;
        if (list) {
          setAgents(list);
          setLoadError(null);
          return list;
        }
      } else {
        setLoadError("Agent status unavailable");
      }
    } catch {
      setLoadError("Agent status offline");
    }
    return null;
  }, []);

  const triggerPipeline = async () => {
    setTriggering(true);
    setLoadError(null);

    pollRef.current = setInterval(fetchAgents, 1500);

    try {
      const res = await fetch("/api/agents/pipeline/trigger", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.data) ? data.data : null;
        if (list) {
          setAgents(list);
          setLoadError(null);
        }
        if (data?.pipeline?.failed) {
          setLoadError("Pipeline incomplete — check agent cards for details");
        }
      } else {
        setLoadError("Pipeline trigger failed");
      }
    } catch {
      setLoadError("Pipeline trigger failed — API offline");
    } finally {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      setTriggering(false);
      await fetchAgents();
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);
    return () => {
      clearInterval(interval);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchAgents]);

  const agentMap = Object.fromEntries(agents.map((a) => [a.name, a]));
  const errorAgent = agents.find((a) => a.status === "error");
  const runningAgent = agents.find((a) => a.status === "running");

  return (
    <div className="glass-card p-5 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-bloom-text">AI Agent Pipeline</h3>
          <p className="text-xs text-bloom-text-muted mt-0.5">
            Data flows left-to-right — each agent hands off to the next
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loadError && (
            <button
              onClick={fetchAgents}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-amber-800/30 text-amber-400 bg-amber-900/20"
            >
              <RefreshCw size={10} />
              Retry
            </button>
          )}
          <button
            onClick={triggerPipeline}
            disabled={triggering}
            className="orange-btn flex items-center gap-1.5 text-xs px-4 py-1.5 disabled:opacity-60"
          >
            <Play size={10} className={triggering ? "animate-pulse" : ""} />
            {triggering ? "Running pipeline…" : "Run Full Pipeline"}
          </button>
        </div>
      </div>

      {(loadError || errorAgent) && (
        <div className="mb-4 px-3 py-2 rounded-xl border border-amber-800/30 bg-amber-900/15 text-xs text-amber-300">
          {errorAgent?.message ?? loadError}
        </div>
      )}

      {triggering && runningAgent && (
        <div className="mb-4 px-3 py-2 rounded-xl border border-bloom-border-hover bg-bloom-orange-dim text-xs text-bloom-orange">
          Active: {AGENT_CONFIG[runningAgent.name]?.label ?? runningAgent.name} — {runningAgent.message}
        </div>
      )}

      <div className="flex items-start overflow-x-auto pb-1 gap-0">
        {PIPELINE_ORDER.map((name, i) => {
          const agent  = agentMap[name];
          const config = AGENT_CONFIG[name];
          const Icon   = config.icon;
          const status = agent?.status ?? "idle";
          const lit    = status === "running" || (status === "idle" && !!agent?.lastRun);

          return (
            <div key={name} className="flex items-start shrink-0">
              <motion.div
                animate={status === "running" ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={{ duration: 0.8, repeat: status === "running" ? Infinity : 0 }}
                className={`flex flex-col items-center gap-2 px-3 py-3 rounded-xl border transition-all duration-300 ${
                  lit
                    ? "bg-bloom-orange-dim border-bloom-border-hover"
                    : "bg-white/3 border-bloom-border"
                }`}
                style={{ minWidth: "96px" }}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  status === "running" ? "bg-bloom-orange" : lit ? "bg-bloom-orange/60" : "bg-white/5"
                }`}>
                  <Icon size={14} className={lit ? "text-bloom-bg" : "text-bloom-text-muted"} />
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <span className={`text-xs font-bold transition-colors duration-300 ${
                      lit ? "text-bloom-text" : "text-bloom-text-muted"
                    }`}>
                      {config.label}
                    </span>
                    {status === "running" && <span className="live-dot w-1.5 h-1.5 shrink-0" />}
                  </div>
                  <p className={`text-[10px] leading-tight max-w-[82px] text-center transition-colors duration-300 ${
                    lit ? "text-bloom-text-muted" : "text-bloom-text-muted/50"
                  }`}>
                    {agent?.message ?? config.description}
                  </p>
                </div>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full transition-all duration-300 ${
                  status === "running"
                    ? "bg-bloom-orange/20 text-bloom-orange"
                    : status === "error"
                    ? "bg-red-900/30 text-red-400"
                    : status === "paused"
                    ? "bg-white/5 text-bloom-text-muted/60"
                    : "bg-white/5 text-bloom-text-muted/60"
                }`}>
                  {status === "running" ? "RUNNING" : status === "error" ? "ERROR" : status === "paused" ? "PAUSED" : "IDLE"}
                </span>
              </motion.div>

              {i < PIPELINE_ORDER.length - 1 && (
                <div className="flex items-center self-center px-1 pt-3">
                  <ChevronRight
                    size={16}
                    className={status === "running" || lit ? "text-bloom-orange" : "text-bloom-border"}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
