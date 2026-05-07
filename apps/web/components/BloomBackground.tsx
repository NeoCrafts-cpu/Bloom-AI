import Image from "next/image";

const FLOWERS = [
  // Large — top right
  { top: "-120px", right: "-160px", w: 620 },
  // Medium — bottom left
  { bottom: "-80px", left: "-120px", w: 400 },
  // Small — top left
  { top: "12%", left: "-60px", w: 220 },
  // Medium — mid right
  { top: "38%", right: "-100px", w: 320 },
  // Small — bottom center
  { bottom: "8%", left: "43%", w: 160 },
  // Tiny — top center
  { top: "5%", left: "30%", w: 130 },
  // Medium — mid left
  { top: "60%", left: "-80px", w: 260 },
  // Small — bottom right
  { bottom: "15%", right: "-40px", w: 200 },
] as const;

export default function BloomBackground() {
  return (
    <>
      {FLOWERS.map((pos, i) => (
        <div
          key={i}
          className="pointer-events-none select-none fixed"
          style={{
            zIndex: 0,
            opacity: 0.06,
            width: pos.w,
            height: pos.w,
            ...pos,
          }}
          aria-hidden="true"
        >
          <Image
            src="/bloom.png"
            alt=""
            fill
            className="object-contain"
            style={{ filter: "sepia(1) saturate(4) hue-rotate(-10deg) brightness(1.2)" }}
            priority={i === 0}
          />
        </div>
      ))}
    </>
  );
}
