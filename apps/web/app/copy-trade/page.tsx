"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import CopyTradeDashboard from "@/components/CopyTradeDashboard";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function CopyTradePage() {
  return (
    <div className="min-h-screen bg-bloom-bg">
      <Navbar />
      <div className="pt-28 px-4 pb-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mt-4 mb-8"
        >
          <div className="pill-badge-orange mb-2">
            <span className="live-dot" />
            Live Execution
          </div>
          <h1 className="text-3xl font-bold text-bloom-text">Copy Trade Center</h1>
          <p className="text-bloom-text-muted text-sm mt-1">
            Connect your wallet, choose a strategy, and let Bloom AI execute via SoDEX. Sentinel risk checks run before every trade.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease }}
        >
          <Suspense fallback={<div className="shimmer rounded-2xl h-96" />}>
            <CopyTradeDashboard />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}
