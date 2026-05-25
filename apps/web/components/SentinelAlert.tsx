"use client";

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { SentinelReport } from "@bloom-ai/types";

export default function SentinelAlert({ report }: { report: SentinelReport }) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-sm font-semibold mb-3 ${report.passed ? "text-emerald-400" : "text-red-400"}`}>
        {report.passed ? (
          <>
            <CheckCircle size={16} />
            All risk checks passed — safe to execute
          </>
        ) : (
          <>
            <XCircle size={16} />
            Risk checks failed — execution blocked
          </>
        )}
      </div>

      {report.checks.map((check) => (
        <div
          key={check.rule}
          className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2 border ${
            check.passed
              ? "bg-emerald-900/10 border-emerald-800/20 text-emerald-400"
              : "bg-red-900/10 border-red-800/20 text-red-400"
          }`}
        >
          {check.passed ? (
            <CheckCircle size={12} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          )}
          <div>
            <span className="font-semibold">{check.rule}</span>
            {check.message && (
              <span className="ml-2 text-red-300">{check.message}</span>
            )}
            <div className="text-xs opacity-70 mt-0.5">
              Actual: {check.actual} / Limit: {check.limit}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
