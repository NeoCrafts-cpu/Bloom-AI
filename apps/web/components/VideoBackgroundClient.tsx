"use client";

import dynamic from "next/dynamic";

const VideoBackground = dynamic(() => import("@/components/VideoBackground"), {
  ssr: false,
});

export default function VideoBackgroundClient() {
  return <VideoBackground />;
}
