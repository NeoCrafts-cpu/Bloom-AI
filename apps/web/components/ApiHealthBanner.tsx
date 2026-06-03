"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Wifi, WifiOff } from "lucide-react";

interface HealthReport {
  status: "ok" | "degraded";
  executionMode: "live" | "simulated";
  ready: boolean;
  uptimeSeconds: number;
  journalist: { fresh: boolean; lastRun: string | null };
  env: { sosovalue: boolean; sodexPrivateKey: boolean };
}

export default function ApiHealthBanner() {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/health", { cache: "no-store" });
        if (!res.ok) throw new Error("health failed");
        const data = await res.json();
        setHealth(data);
        setOffline(false);
      } catch {
        setOffline(true);
        setHealth(null);
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  if (offline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-red-950/95 border-b border-red-800/50 px-4 py-2 flex items-center justify-center gap-2 text-xs text-red-300">
        <WifiOff size={14} />
        <span>
          <strong>API Offline</strong> — Backend may be cold-starting (30s). Data panels may show cached or empty states.
        </span>
      </div>
    );
  }

  if (!health) return null;

  const isLive = health.status === "ok" && health.ready;
  const isSimulated = health.executionMode === "simulated";

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] px-4 py-1.5 flex items-center justify-center gap-3 text-[11px] border-b ${
        isLive
          ? "bg-emerald-950/90 border-emerald-800/40 text-emerald-300"
          : "bg-amber-950/90 border-amber-800/40 text-amber-300"
      }`}
    >
      {isLive ? <Wifi size={12} /> : <AlertCircle size={12} />}
      <span>
        {isLive ? (
          <>
            <strong>LIVE</strong> · SoSoValue connected · Journalist active
          </>
        ) : (
          <>
            <strong>DEGRADED</strong> · Some services warming up
          </>
        )}
        {isSimulated && (
          <> · Execution: <strong>SIMULATED</strong> (no SODEX key)</>
        )}
        {!isSimulated && (
          <> · Execution: <strong>LIVE</strong></>
        )}
      </span>
      {health.journalist.lastRun && (
        <span className="opacity-70 hidden sm:inline">
          Last intel: {new Date(health.journalist.lastRun).toLocaleTimeString()}
        </span>
      )}
      <CheckCircle size={12} className="opacity-50 hidden md:inline" />
    </div>
  );
}
