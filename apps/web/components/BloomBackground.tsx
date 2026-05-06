import Image from "next/image";

/**
 * Decorative bloom flower background — used on inner pages.
 * Mirrors the sphere motif in the reference design but uses
 * the Bloom AI logo flower shape instead.
 */
export default function BloomBackground() {
  return (
    <>
      {/* Large flower — top right */}
      <div
        className="pointer-events-none select-none fixed top-[-120px] right-[-160px] w-[620px] h-[620px]"
        style={{ zIndex: 0, opacity: 0.055 }}
        aria-hidden="true"
      >
        <Image
          src="/bloom.png"
          alt=""
          fill
          className="object-contain"
          style={{ filter: "sepia(1) saturate(4) hue-rotate(-10deg) brightness(1.2)" }}
          priority
        />
      </div>

      {/* Smaller flower — bottom left */}
      <div
        className="pointer-events-none select-none fixed bottom-[-80px] left-[-120px] w-[380px] h-[380px]"
        style={{ zIndex: 0, opacity: 0.035 }}
        aria-hidden="true"
      >
        <Image
          src="/bloom.png"
          alt=""
          fill
          className="object-contain"
          style={{ filter: "sepia(1) saturate(4) hue-rotate(-10deg) brightness(1.2)" }}
        />
      </div>
    </>
  );
}
