"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Layers, Zap, Shield } from "lucide-react";
import type { AgentState } from "@bloom-ai/types";

const AGENT_ICONS = {
  journalist: Brain,
  strategist: Layers,
  broker: Zap,
  sentinel: Shield,
};

const AGENT_LABELS = {
  journalist: "Journalist",
  strategist: "Strategist",
  broker: "Broker",
  sentinel: "Sentinel",
};

const MOCK_INITIAL: AgentState[] = [
  { name: "journalist", status: "running", lastRun: new Date().toISOString(), message: "Polling SoSoValue Terminal API..." },
  { name: "strategist", status: "idle", lastRun: new Date(Date.now() - 180000).toISOString() },
  { name: "broker", status: "idle" },
  { name: "sentinel", status: "running", message: "Monitoring all payloads" },
];

export default function AgentStatusBar() {
  const [agents, setAgents] = useState<AgentState[]>(MOCK_INITIAL);

  // Poll API for live agent state
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/agents`
        );
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : null;
          if (list) setAgents(list);
        }
      } catch {
        // fallback to mock — API not yet running
      }
    };

    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {agents.map((agent, i) => {
        const Icon = AGENT_ICONS[agent.name];
        return (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ scale: 1.02, borderColor: "rgba(232,97,10,0.3)" }}
            className="glass-card p-4 flex items-start gap-3"
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                agent.status === "running"
                  ? "bg-bloom-orange-dim border border-bloom-border-hover"
                  : agent.status === "error"
                  ? "bg-red-900/20 border border-red-800/30"
                  : "bg-white/5 border border-bloom-border"
              }`}
            >
              <Icon
                size={14}
                className={
                  agent.status === "running"
                    ? "text-bloom-orange"
                    : agent.status === "error"
                    ? "text-red-400"
                    : "text-bloom-text-muted"
                }
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-semibold text-bloom-text">
                  {AGENT_LABELS[agent.name]}
                </span>
                {agent.status === "running" && (
                  <span className="live-dot w-1.5 h-1.5" />
                )}
              </div>
              <p
                className={`text-xs truncate ${
                  agent.status === "running"
                    ? "text-bloom-orange"
                    : agent.status === "error"
                    ? "text-red-400"
                    : "text-bloom-text-muted"
                }`}
              >
                {agent.status === "running"
                  ? agent.message ?? "Running..."
                  : agent.status === "idle"
                  ? "Idle"
                  : "Error"}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
