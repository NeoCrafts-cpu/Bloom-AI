"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import Navbar from "@/components/Navbar";
import CopyTradeDashboard from "@/components/CopyTradeDashboard";
import AgentStatusBar from "@/components/AgentStatusBar";
import { PageHeader } from "@/components/PageHeader";

export default function CopyTradePage() {
  return (
    <div className="min-h-screen bg-bloom-bg">
      <Navbar />
      <div className="pt-24 px-4 pb-12 max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Step 3 · Live execution"
          live
          title={
            <>
              Copy Trade <span className="orange-gradient-text">Center</span>
            </>
          }
          subtitle="1) Pick a strategy → 2) Connect wallet → 3) Set size → sign → Sentinel → SoDEX."
          actions={
            <Link href="/strategies" className="orange-btn flex items-center gap-2 text-sm px-4 py-2">
              <Layers size={14} />
              Browse strategies
            </Link>
          }
        />

        <div className="mb-6">
          <AgentStatusBar />
        </div>

        <Suspense fallback={<div className="shimmer rounded-2xl h-96" />}>
          <CopyTradeDashboard />
        </Suspense>
      </div>
    </div>
  );
}
