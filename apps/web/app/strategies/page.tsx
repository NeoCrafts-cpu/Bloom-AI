"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import StrategiesGrid from "@/components/StrategiesGrid";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function StrategiesPage() {
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
          <div className="pill-badge mb-2">SSI Protocol</div>
          <h1 className="text-3xl font-bold text-bloom-text">On-Chain Strategies</h1>
          <p className="text-bloom-text-muted text-sm mt-1">
            AI-minted Wrapped Token indices. One click to copy the exact portfolio on-chain via SoDEX.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease }}
        >
          <StrategiesGrid />
        </motion.div>
      </div>
    </div>
  );
}
