"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useState, useRef, useEffect } from "react";
import { Wallet, ChevronDown, LogOut, Copy, CheckCircle } from "lucide-react";

export default function WalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    setOpen(false);
  };

  const short = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        disabled={isPending}
        className="orange-btn flex items-center gap-2 text-sm px-4 py-1.5 disabled:opacity-60"
      >
        <Wallet size={14} />
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bloom-orange-dim border border-bloom-border-hover text-sm text-bloom-orange font-medium hover:bg-orange-900/20 transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        {short}
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 glass-card p-2 min-w-[200px] shadow-xl">
          <div className="px-3 py-2 border-b border-bloom-border mb-1">
            <p className="text-xs text-bloom-text-muted">Connected to</p>
            <p className="text-xs font-semibold text-bloom-text">
              {chain?.name ?? "Unknown network"}
            </p>
          </div>
          <button
            onClick={copyAddress}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-bloom-text-muted hover:text-bloom-text rounded-lg hover:bg-white/5 transition-colors"
          >
            {copied ? (
              <CheckCircle size={12} className="text-emerald-400" />
            ) : (
              <Copy size={12} />
            )}
            {copied ? "Copied!" : "Copy address"}
          </button>
          <button
            onClick={() => { disconnect(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 rounded-lg hover:bg-red-900/10 transition-colors"
          >
            <LogOut size={12} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
