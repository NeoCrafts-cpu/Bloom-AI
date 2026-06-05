"use client";

import { useEffect, useRef } from "react";

const SPACING   = 32;   // grid cell size in px
const BASE_R    = 1.4;  // base dot radius
const GLOW_R    = 140;  // pixel radius around cursor that lights up
const BASE_ALPHA = 0.14; // resting dot opacity
const PEAK_ALPHA = 0.78; // dot opacity at cursor center

export default function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    let mx = -9999, my = -9999;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
    };

    const onMouse = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    const onLeave = () => { mx = -9999; my = -9999; };

    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      const cols = Math.ceil(W / SPACING) + 1;
      const rows = Math.ceil(H / SPACING) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * SPACING;
          const y = r * SPACING;
          const dx = x - mx;
          const dy = y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const strength = Math.max(0, 1 - dist / GLOW_R);

          const alpha = BASE_ALPHA + strength * (PEAK_ALPHA - BASE_ALPHA);
          const radius = BASE_R + strength * 2.0;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(232,97,10,${alpha.toFixed(3)})`;
          ctx.fill();
        }
      }
    };

    resize();
    window.addEventListener("resize",      resize);
    window.addEventListener("mousemove",   onMouse);
    window.addEventListener("mouseleave",  onLeave);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize",     resize);
      window.removeEventListener("mousemove",  onMouse);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
