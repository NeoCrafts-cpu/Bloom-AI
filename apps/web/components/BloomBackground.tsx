import Image from "next/image";

const FLOWERS = [
  // --- Originals (boosted opacity) ---
  // Large — top right
  { top: "-120px", right: "-160px", w: 620, opacity: 0.18 },
  // Medium — bottom left
  { bottom: "-80px", left: "-120px", w: 400, opacity: 0.20 },
  // Small — top left
  { top: "12%", left: "-60px", w: 220, opacity: 0.16 },
  // Medium — mid right
  { top: "38%", right: "-100px", w: 320, opacity: 0.18 },
  // Small — bottom center
  { bottom: "8%", left: "43%", w: 160, opacity: 0.14 },
  // Tiny — top center
  { top: "5%", left: "30%", w: 130, opacity: 0.14 },
  // Medium — mid left
  { top: "60%", left: "-80px", w: 260, opacity: 0.18 },
  // Small — bottom right
  { bottom: "15%", right: "-40px", w: 200, opacity: 0.16 },
  // --- Additional flowers ---
  { top: "25%", left: "55%", w: 280, opacity: 0.13 },
  { top: "48%", left: "70%", w: 340, opacity: 0.15 },
  { top: "72%", left: "50%", w: 240, opacity: 0.13 },
  { top: "18%", right: "30%", w: 180, opacity: 0.12 },
  { bottom: "30%", right: "-60px", w: 300, opacity: 0.17 },
  { bottom: "50%", left: "20%", w: 200, opacity: 0.13 },
  { top: "-60px", left: "15%", w: 360, opacity: 0.16 },
  { bottom: "-40px", right: "20%", w: 320, opacity: 0.18 },
  { top: "35%", left: "35%", w: 150, opacity: 0.11 },
  { top: "80%", right: "35%", w: 190, opacity: 0.13 },
  { top: "55%", left: "15%", w: 130, opacity: 0.12 },
  { top: "8%", right: "10%", w: 170, opacity: 0.14 },
];

export default function BloomBackground() {
  return (
    <>
      {FLOWERS.map((pos, i) => (
        <div
          key={i}
          className="pointer-events-none select-none fixed"
          style={{
            zIndex: 0,
            opacity: pos.opacity,
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
