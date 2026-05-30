"use client";

import { useRef, useEffect } from "react";

export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const show = () => { video.style.opacity = "1"; };
    video.addEventListener("canplay", show);
    // If already ready (cached), show immediately
    if (video.readyState >= 3) show();
    return () => video.removeEventListener("canplay", show);
  }, []);

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
      style={{ background: "#0a0a0a" }}
    >
      <video
        ref={videoRef}
        src="/bg.mp4"
        poster="/poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0, transition: "opacity 0.8s ease" }}
      />
      {/* Dark overlay so text remains readable */}
      <div className="absolute inset-0 bg-black/70" />
    </div>
  );
}
