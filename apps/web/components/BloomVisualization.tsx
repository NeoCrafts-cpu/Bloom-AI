"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const ORANGE = 0xe8610a;
const AMBER  = 0xf5a020;

/** Project (phi, theta) onto sphere surface at radius r */
const onSphere = (phi: number, theta: number, r = 1.9) =>
  new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta) * r,
    Math.cos(phi) * r,
    Math.sin(phi) * Math.sin(theta) * r,
  );

/**
 * Globe of white dots with 5 orange flower petals on the surface.
 * Responds to mouse with parallax tilt.
 */
export default function BloomVisualization() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth  || 520;
    const H = mount.clientHeight || 520;

    // ── renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── scene / camera ────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.01, 100);
    camera.position.set(0, 1.6, 5.8);
    camera.lookAt(0, 0, 0);

    const root = new THREE.Group();
    scene.add(root);

    // ── globe dot cloud ───────────────────────────────────────────────────
    const globePts: number[] = [];
    for (let row = 0; row <= 26; row++) {
      const phi  = (row / 26) * Math.PI;
      const cols = Math.max(1, Math.round(Math.sin(phi) * 34));
      for (let col = 0; col < cols; col++) {
        const p = onSphere(phi, (col / cols) * Math.PI * 2);
        globePts.push(p.x, p.y, p.z);
      }
    }
    const globeGeo = new THREE.BufferGeometry();
    globeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(globePts), 3));
    root.add(new THREE.Points(globeGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.018, transparent: true, opacity: 0.20,
    })));

    // ── 5 flower petals on sphere surface (radiate from north pole) ───────
    const PETAL_N   = 5;
    const PHI_MAX   = 1.18; // ~67° from pole
    const PHI_STEPS = 38;
    const tipNodes: THREE.Mesh[] = [];
    const tipGlows: THREE.Mesh[] = [];

    for (let i = 0; i < PETAL_N; i++) {
      const baseTheta = (i / PETAL_N) * Math.PI * 2;
      const col       = i % 2 === 0 ? ORANGE : AMBER;

      // Dense dot fill
      const petalPts: number[] = [];
      for (let si = 0; si <= PHI_STEPS; si++) {
        const phi   = (si / PHI_STEPS) * PHI_MAX;
        const t     = si / PHI_STEPS;
        const halfW = 0.28 * Math.sin(t * Math.PI);
        for (let wi = 0; wi <= 10; wi++) {
          const theta = baseTheta + (wi / 10 - 0.5) * 2 * halfW;
          const p = onSphere(phi, theta);
          petalPts.push(p.x, p.y, p.z);
        }
      }
      const ppGeo = new THREE.BufferGeometry();
      ppGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(petalPts), 3));
      root.add(new THREE.Points(ppGeo, new THREE.PointsMaterial({
        color: col, size: 0.030, transparent: true, opacity: 0.82,
      })));

      // Spine line (midrib)
      const spine: THREE.Vector3[] = [];
      for (let si = 0; si <= PHI_STEPS; si++) {
        spine.push(onSphere((si / PHI_STEPS) * PHI_MAX, baseTheta));
      }
      root.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(spine),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.50 }),
      ));

      // Tip node
      const tipPt = onSphere(PHI_MAX, baseTheta);
      const tip   = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 12, 12),
        new THREE.MeshBasicMaterial({ color: col }),
      );
      tip.position.copy(tipPt);
      root.add(tip);
      tipNodes.push(tip);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 10),
        new THREE.MeshBasicMaterial({
          color: col, transparent: true, opacity: 0.13, side: THREE.BackSide,
        }),
      );
      glow.position.copy(tipPt);
      root.add(glow);
      tipGlows.push(glow);
    }

    // ── central core ──────────────────────────────────────────────────────
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.20, 32, 32),
      new THREE.MeshBasicMaterial({ color: ORANGE }),
    );
    root.add(core);

    ([
      [0.38, 0.16],
      [0.66, 0.07],
      [1.00, 0.025],
    ] as [number, number][]).forEach(([r, op]) => {
      root.add(new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 16),
        new THREE.MeshBasicMaterial({
          color: ORANGE, transparent: true, opacity: op, side: THREE.BackSide,
        }),
      ));
    });

    // ── orbital rings ─────────────────────────────────────────────────────
    const makeRing = (r: number, tiltX: number, tiltZ: number, opacity: number) => {
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 128; j++) {
        const a = (j / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity }),
      );
      ring.rotation.x = tiltX;
      ring.rotation.z = tiltZ;
      root.add(ring);
    };

    makeRing(2.40,  0.32,  0.00, 0.18);
    makeRing(1.55, -0.20,  0.14, 0.10);
    makeRing(3.00,  0.10, -0.10, 0.05);

    // ── traveling dot on outer ring ───────────────────────────────────────
    const traveler = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: AMBER }),
    );
    scene.add(traveler);
    const travelerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshBasicMaterial({
        color: AMBER, transparent: true, opacity: 0.16, side: THREE.BackSide,
      }),
    );
    scene.add(travelerGlow);

    // ── outer particle field ──────────────────────────────────────────────
    const N = 180;
    const fp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 2.4 + Math.random() * 2.8;
      fp[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
      fp[i * 3 + 1] = Math.cos(phi) * r;
      fp[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    }
    const fpGeo = new THREE.BufferGeometry();
    fpGeo.setAttribute("position", new THREE.BufferAttribute(fp, 3));
    root.add(new THREE.Points(fpGeo, new THREE.PointsMaterial({
      color: ORANGE, size: 0.028, transparent: true, opacity: 0.30,
    })));

    // ── mouse parallax ────────────────────────────────────────────────────
    const mouse  = { x: 0, y: 0 };
    const lerped = { x: 0, y: 0 };

    const onMM = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      mouse.y = -((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMM);

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // ── animation loop ────────────────────────────────────────────────────
    let raf = 0;
    let t   = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      t  += 0.007;

      lerped.x += (mouse.x * 0.28 - lerped.x) * 0.04;
      lerped.y += (mouse.y * 0.20 - lerped.y) * 0.04;

      root.rotation.y = t * 0.16 + lerped.x;
      root.rotation.x = lerped.y * 0.35 - 0.18; // slight tilt so petals face viewer

      const pulse = 1 + Math.sin(t * 2.8) * 0.07;
      core.scale.setScalar(pulse);

      tipNodes.forEach((n, i) => {
        const s = 1 + Math.sin(t * 3.2 + i * 1.26) * 0.18;
        n.scale.setScalar(s);
        tipGlows[i].scale.setScalar(s * 1.1);
      });

      const tR    = 2.40;
      const ta    = t * 0.85;
      const tiltX = 0.32;
      traveler.position.set(
        Math.cos(ta) * tR,
        Math.sin(ta) * tR * Math.sin(tiltX),
        Math.sin(ta) * tR * Math.cos(tiltX),
      );
      travelerGlow.position.copy(traveler.position);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMM);
      window.removeEventListener("resize",    onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-crosshair"
      style={{ minHeight: 480 }}
    />
  );
}
