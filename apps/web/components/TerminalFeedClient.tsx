"use client";

import dynamic from "next/dynamic";

const TerminalFeed = dynamic(() => import("@/components/TerminalFeed"), {
  ssr: false,
});

export default function TerminalFeedClient() {
  return <TerminalFeed />;
}
