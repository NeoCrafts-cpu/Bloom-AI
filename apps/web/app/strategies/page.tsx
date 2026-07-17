"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import StrategiesGrid from "@/components/StrategiesGrid";
import AgentStatusBar from "@/components/AgentStatusBar";
import { PageHeader } from "@/components/PageHeader";

export default function StrategiesPage() {
  return (
    <div className="min-h-screen bg-bloom-bg">
      <Navbar />
      <div className="pt-24 px-4 pb-12 max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Step 2 · SSI baskets"
          title={
            <>
              Choose a <span className="orange-gradient-text">strategy</span>
            </>
          }
          subtitle="Review AI-minted portfolios, compare weights, then open Trade to execute on SoDEX with Sentinel checks."
          actions={
            <Link href="/strategies/studio" className="orange-btn-outline flex items-center gap-2 text-sm px-4 py-2">
              <Plus size={14} />
              Studio
            </Link>
          }
        />

        <div className="mb-8">
          <AgentStatusBar />
        </div>

        <StrategiesGrid />
      </div>
    </div>
  );
}
