"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, RefreshCw, AlertTriangle } from "lucide-react";

interface BloomAlert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  symbol?: string;
  timestamp: string;
}

export default function AlertsPanel({ className = "" }: { className?: string }) {
  const [alerts, setAlerts] = useState<BloomAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/market/alerts?limit=12");
      if (!res.ok) throw new Error("fail");
      const json = await res.json();
      setAlerts(Array.isArray(json?.data) ? json.data : []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className={`glass-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-bloom-orange" />
          <h3 className="text-sm font-bold text-bloom-text">Live Alerts</h3>
        </div>
        <button onClick={load} className="p-1.5 text-bloom-text-muted hover:text-bloom-text" aria-label="Refresh alerts">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      {loading && alerts.length === 0 ? (
        <p className="text-xs text-bloom-text-muted py-6 text-center">Scanning…</p>
      ) : alerts.length === 0 ? (
        <p className="text-xs text-bloom-text-muted py-6 text-center flex items-center justify-center gap-2">
          <AlertTriangle size={12} /> No alerts yet — engine scans every 5 min
        </p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {alerts.map((a) => (
            <div key={a.id} className="border border-bloom-border rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-bloom-text">{a.title}</span>
                <span className={`text-[10px] uppercase ${
                  a.severity === "critical" ? "text-red-400" : a.severity === "warning" ? "text-amber-400" : "text-emerald-400"
                }`}>{a.severity}</span>
              </div>
              <p className="text-[11px] text-bloom-text-muted">{a.message}</p>
              <p className="text-[10px] text-bloom-text-muted mt-1">{new Date(a.timestamp).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
