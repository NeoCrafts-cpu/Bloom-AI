/** Shared API / WebSocket base URL helpers for browser and SSR. */

export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (typeof window === "undefined") {
    return envUrl ?? "";
  }
  if (envUrl) return envUrl;
  if (window.location.hostname === "localhost") {
    return "http://localhost:4000";
  }
  // Same-origin — Next.js rewrites proxy /api/* to the backend.
  return "";
}

export function getWsBaseUrl(): string {
  const http = getApiBaseUrl();
  if (http) {
    return http.replace(/^http/i, "ws");
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}`;
  }
  return "ws://localhost:4000";
}

export type PanelDataStatus = "live" | "stale" | "empty" | "unavailable" | "cached" | "offline" | "demo";

export const PANEL_STATUS_STYLES: Record<string, string> = {
  live: "text-emerald-400 bg-emerald-900/20 border-emerald-800/30",
  stale: "text-amber-400 bg-amber-900/20 border-amber-800/30",
  cached: "text-amber-400 bg-amber-900/20 border-amber-800/30",
  empty: "text-bloom-text-muted bg-white/5 border-bloom-border",
  unavailable: "text-bloom-text-muted bg-white/5 border-bloom-border",
  offline: "text-amber-400 bg-amber-900/20 border-amber-800/30",
  demo: "text-amber-400 bg-amber-900/20 border-amber-800/30",
};

export function panelStatusLabel(status: PanelDataStatus): string {
  switch (status) {
    case "live": return "Live";
    case "stale": return "Cached · Stale";
    case "cached": return "Cached";
    case "empty": return "Optional data missing";
    case "unavailable": return "Offline";
    case "offline": return "Realtime offline";
    case "demo": return "Demo sample";
    default: return status;
  }
}
