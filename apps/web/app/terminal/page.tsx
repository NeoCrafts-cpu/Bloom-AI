import AgentStatusBar from "@/components/AgentStatusBar";
import MarketTicker from "@/components/MarketTicker";
import TerminalFeedClient from "@/components/TerminalFeedClient";
import ForceRefreshButton from "@/components/ForceRefreshButton";
import Navbar from "@/components/Navbar";
import ETFFlowsPanel from "@/components/ETFFlowsPanel";
import SoSoNewsPanel from "@/components/SoSoNewsPanel";
import { PageHeader } from "@/components/PageHeader";

export const metadata = {
  title: "Terminal | Bloom AI",
  description: "Smart Money Newsletters — Institutional intelligence, democratized.",
};

export default function TerminalPage() {
  return (
    <main className="min-h-screen bg-bloom-bg pt-24">
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-4 pb-12">
        <PageHeader
          eyebrow="News · Intelligence"
          live
          title={
            <>
              Smart Money <span className="orange-gradient-text">Terminal</span>
            </>
          }
          subtitle="AI newsletters from SoSoValue data. Run the pipeline, then browse strategies when a narrative is clear."
          actions={<ForceRefreshButton />}
        />

        <div className="mb-4">
          <AgentStatusBar />
        </div>
        <MarketTicker />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 mt-6">
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
