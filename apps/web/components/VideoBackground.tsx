"use client";

export default function VideoBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <video
        src="/video background.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark overlay so text remains readable */}
      <div className="absolute inset-0 bg-bloom-bg/60" />
    </div>
  );
}
