"use client";

import { useEffect, useRef } from "react";

const TAU    = Math.PI * 2;
const ORANGE = "#E8610A";
const AMBER  = "#F5A020";

/** Rotate point (px,py) around origin by angle a */
function rot(px: number, py: number, a: number): [number, number] {
  const c = Math.cos(a), s = Math.sin(a);
  return [px * c - py * s, px * s + py * c];
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number, alpha: number,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0,   `rgba(232,97,10,${(alpha * 0.9).toFixed(2)})`);
  g.addColorStop(0.5, `rgba(232,97,10,${(alpha * 0.4).toFixed(2)})`);
  g.addColorStop(1,   "rgba(232,97,10,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** Node positions inside one petal (local coords, tip is at y = -petalLen) */
function petalNodes(petalLen: number, rows: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let row = 0; row <= rows; row++) {
    const t2 = row / rows;
    const y = -petalLen * t2;
    const halfW = petalLen * 0.26 * Math.sin(t2 * Math.PI);
    const cols = row === 0 ? 1 : Math.max(1, Math.round((halfW / (petalLen * 0.065))));
    for (let c = 0; c < cols; c++) {
      const x = cols === 1 ? 0 : -halfW + (c / (cols - 1)) * halfW * 2;
      pts.push([x, y]);
    }
  }
  return pts;
}

/**
 * BloomVisualization — interactive Canvas 2D.
 * Renders the pentagonal "Bloom flower" from the reference image:
 * 5 lens-shaped petals, internal node grid, sacred-geometry cross-connections.
 * Mouse-parallax + node pulse animations.
 */
export default function BloomVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;
    const mouse   = { x: 0, y: 0 };
    const lerped  = { x: 0, y: 0 };
    let t = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = canvas.parentElement?.clientWidth  ?? 520;
      const h = canvas.parentElement?.clientHeight ?? 520;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMM = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      mouse.y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMM);

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const W = canvas.width, H = canvas.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      const cx   = W / 2 + lerped.x * W * 0.025;
      const cy   = H / 2 + lerped.y * H * 0.025;
      const size = Math.min(W, H) * 0.44;

      const PETAL_N   = 5;
      const PETAL_LEN = size * 0.90;
      const PETAL_W   = PETAL_LEN * 0.40;
      const NODE_ROWS = 7;

      const petalAngles = Array.from({ length: PETAL_N }, (_, i) =>
        -Math.PI / 2 + (i / PETAL_N) * TAU,
      );

      // ── ambient center glow ──────────────────────────────────────────
      drawGlow(ctx, cx, cy, size * 1.05, 0.10 + Math.sin(t * 1.4) * 0.03);

      // ── petal outlines (lens / vesica shape) ─────────────────────────
      petalAngles.forEach((angle, pi) => {
        const alpha = 0.52 + Math.sin(t * 1.8 + pi * 0.63) * 0.11;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        const R = (PETAL_LEN * PETAL_LEN + PETAL_W * PETAL_W) / (2 * PETAL_W);
        const D = R - PETAL_W;
        const ha = Math.asin(Math.min(PETAL_LEN / (2 * R), 1));

        ctx.beginPath();
        ctx.arc(-D, -PETAL_LEN / 2, R, -Math.PI / 2 + ha,  Math.PI / 2 - ha);
        ctx.arc( D, -PETAL_LEN / 2, R,  Math.PI / 2 + ha, -Math.PI / 2 - ha, true);
        ctx.closePath();
        ctx.strokeStyle = `rgba(232,97,10,${alpha.toFixed(2)})`;
        ctx.lineWidth   = dpr * 1.3;
        ctx.stroke();
        ctx.restore();
      });

      // ── internal petal lines + nodes ──────────────────────────────────
      petalAngles.forEach((angle, pi) => {
        const nodes = petalNodes(PETAL_LEN, NODE_ROWS);
        const world: [number, number][] = nodes.map(([lx, ly]) => {
          const [rx, ry] = rot(lx, ly, angle);
          return [cx + rx, cy + ry];
        });

        const lineAlpha = 0.32 + Math.sin(t * 1.6 + pi) * 0.08;
        ctx.strokeStyle = `rgba(232,97,10,${lineAlpha.toFixed(2)})`;
        ctx.lineWidth   = dpr * 0.85;

        for (let i = 0; i < world.length; i++) {
          for (let j = i + 1; j < world.length; j++) {
            const dx = world[i][0] - world[j][0];
            const dy = world[i][1] - world[j][1];
            if (dx * dx + dy * dy < (PETAL_LEN * 0.27) ** 2) {
              ctx.beginPath();
              ctx.moveTo(world[i][0], world[i][1]);
              ctx.lineTo(world[j][0], world[j][1]);
              ctx.stroke();
            }
          }
          // radial spoke to center
          ctx.beginPath();
          ctx.moveTo(world[i][0], world[i][1]);
          ctx.lineTo(cx, cy);
          ctx.stroke();
        }

        world.forEach(([wx, wy], ni) => {
          const pulse  = 1 + Math.sin(t * 2.5 + pi * 1.26 + ni * 0.42) * 0.22;
          const isTip  = ni === world.length - 1;
          const nodeR  = (isTip ? 5.5 : 3.5) * dpr * pulse;

          drawGlow(ctx, wx, wy, nodeR * 3.8, isTip ? 0.55 : 0.28);

          ctx.beginPath();
          ctx.arc(wx, wy, nodeR, 0, TAU);
          ctx.fillStyle = isTip ? AMBER : ORANGE;
          ctx.fill();
        });
      });

      // ── cross-petal connections (star pattern) ────────────────────────
      const getWorld = (angle: number, frac: number): [number, number] => {
        const [rx, ry] = rot(0, -PETAL_LEN * frac, angle);
        return [cx + rx, cy + ry];
      };

      // Connect tip nodes (all-to-all = pentagram star lines)
      ctx.strokeStyle = `rgba(232,97,10,0.28)`;
      ctx.lineWidth   = dpr * 1.0;
      const tips = petalAngles.map((a) => getWorld(a, 1.0));
      for (let i = 0; i < PETAL_N; i++) {
        for (let j = i + 1; j < PETAL_N; j++) {
          ctx.beginPath();
          ctx.moveTo(tips[i][0], tips[i][1]);
          ctx.lineTo(tips[j][0], tips[j][1]);
          ctx.stroke();
        }
      }

      // Mid-ring: adjacent + skip-one connections
      const mids = petalAngles.map((a) => getWorld(a, 0.55));
      ctx.strokeStyle = `rgba(232,97,10,0.20)`;
      ctx.lineWidth   = dpr * 0.8;
      for (let i = 0; i < PETAL_N; i++) {
        for (const skip of [1, 2]) {
          const j = (i + skip) % PETAL_N;
          ctx.beginPath();
          ctx.moveTo(mids[i][0], mids[i][1]);
          ctx.lineTo(mids[j][0], mids[j][1]);
          ctx.stroke();
        }
      }

      // Inner ring
      const inners = petalAngles.map((a) => getWorld(a, 0.28));
      ctx.strokeStyle = `rgba(232,97,10,0.16)`;
      for (let i = 0; i < PETAL_N; i++) {
        for (const skip of [1, 2]) {
          const j = (i + skip) % PETAL_N;
          ctx.beginPath();
          ctx.moveTo(inners[i][0], inners[i][1]);
          ctx.lineTo(inners[j][0], inners[j][1]);
          ctx.stroke();
        }
      }

      // Tip node glows
      tips.forEach(([wx, wy], pi) => {
        const pulse = 1 + Math.sin(t * 2.2 + pi * 1.26) * 0.20;
        drawGlow(ctx, wx, wy, 16 * dpr * pulse, 0.55);
        ctx.beginPath();
        ctx.arc(wx, wy, 5.5 * dpr * pulse, 0, TAU);
        ctx.fillStyle = AMBER;
        ctx.fill();
      });

      // ── central core ──────────────────────────────────────────────────
      const cp = 1 + Math.sin(t * 2.0) * 0.12;
      drawGlow(ctx, cx, cy, size * 0.20 * cp, 0.65);
      ctx.beginPath();
      ctx.arc(cx, cy, 7 * dpr * cp, 0, TAU);
      ctx.fillStyle = AMBER;
      ctx.fill();
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      t  += 0.008;
      lerped.x += (mouse.x * 0.16 - lerped.x) * 0.05;
      lerped.y += (mouse.y * 0.16 - lerped.y) * 0.05;
      draw();
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ minHeight: 480, display: "block" }}
    />
  );
}
