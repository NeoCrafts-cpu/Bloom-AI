import AgentStatusBar from "@/components/AgentStatusBar";
import MarketTicker from "@/components/MarketTicker";
import TerminalFeedClient from "@/components/TerminalFeedClient";
import ForceRefreshButton from "@/components/ForceRefreshButton";
import Navbar from "@/components/Navbar";
import ETFFlowsPanel from "@/components/ETFFlowsPanel";
import SoSoNewsPanel from "@/components/SoSoNewsPanel";

export const metadata = {
  title: "Terminal | Bloom AI",
  description: "Smart Money Newsletters — Institutional intelligence, democratized.",
};

export default function TerminalPage() {
  return (
    <main className="min-h-screen bg-bloom-bg pt-28">
      <Navbar />
      {/* Agent status bar */}
      <AgentStatusBar />

      {/* Market ticker */}
      <MarketTicker />

      {/* Main terminal feed */}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="live-dot" />
              <span className="text-xs font-mono text-bloom-orange uppercase tracking-widest">
                Live Intelligence Feed
              </span>
            </div>
            <h1 className="text-2xl font-bold text-bloom-text">
              Smart Money{" "}
              <span className="orange-gradient-text">Terminal</span>
            </h1>
            <p className="text-sm text-bloom-text-muted mt-1">
              AI-generated institutional newsletters powered by SoSoValue data
            </p>
          </div>

          {/* Trigger manual refresh */}
          <ForceRefreshButton />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <div className="xl:col-span-3">
            <TerminalFeedClient />
          </div>
          <div className="xl:col-span-1 space-y-5">
            <ETFFlowsPanel />
            <SoSoNewsPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
