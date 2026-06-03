"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const ORANGE = 0xe8610a;
const AMBER  = 0xf5a020;

/**
 * Interactive 3D bloom flower — 5 petals (one per AI agent) orbiting a central
 * glowing core. Responds to mouse movement with subtle parallax tilt.
 * Built with Three.js (already in dependencies).
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
    camera.position.set(0, 1.2, 6.5);
    camera.lookAt(0, 0, 0);

    const root = new THREE.Group();
    scene.add(root);

    // ── central core ──────────────────────────────────────────────────────
    const coreGeo = new THREE.SphereGeometry(0.22, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({ color: ORANGE });
    const core    = new THREE.Mesh(coreGeo, coreMat);
    root.add(core);

    // glow shells around core
    ([
      [0.42, 0.15],
      [0.72, 0.07],
      [1.10, 0.025],
    ] as [number, number][]).forEach(([r, op]) => {
      root.add(new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 16),
        new THREE.MeshBasicMaterial({
          color: ORANGE, transparent: true, opacity: op, side: THREE.BackSide,
        }),
      ));
    });

    // ── 5 petals (one per agent) ──────────────────────────────────────────
    const PETAL_N  = 5;
    const tipNodes: THREE.Mesh[]  = [];
    const tipGlows: THREE.Mesh[]  = [];

    for (let i = 0; i < PETAL_N; i++) {
      const ang = (i / PETAL_N) * Math.PI * 2;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const col = i % 2 === 0 ? ORANGE : AMBER;
      const L   = 1.95 + (i % 3) * 0.12;  // slight length variation

      // tip point
      const tipPt = new THREE.Vector3(cos * L, 0.08, sin * L);

      // two bezier edges form the petal outline
      const leftEdge = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(cos * L * 0.55 - sin * 0.38, 0.65, sin * L * 0.55 + cos * 0.38),
        tipPt,
      );
      const rightEdge = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(cos * L * 0.55 + sin * 0.38, 0.65, sin * L * 0.55 - cos * 0.38),
        tipPt,
      );
      // midrib (center spine, slightly higher arc)
      const midrib = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(cos * L * 0.52, 0.78, sin * L * 0.52),
        tipPt,
      );

      const addLine = (curve: THREE.Curve<THREE.Vector3>, opacity: number) => {
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(44));
        const mat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity });
        root.add(new THREE.Line(geo, mat));
      };

      addLine(leftEdge,  0.55);
      addLine(rightEdge, 0.55);
      addLine(midrib,    0.25);

      // fill polygon between edges (translucent mesh)
      const pts: THREE.Vector3[] = [];
      const leftPts  = leftEdge.getPoints(24);
      const rightPts = rightEdge.getPoints(24);
      // interleave as triangle strip
      for (let j = 0; j < leftPts.length; j++) {
        pts.push(leftPts[j], rightPts[j]);
      }
      const fillPositions = new Float32Array(pts.length * 3);
      pts.forEach((p, k) => {
        fillPositions[k * 3]     = p.x;
        fillPositions[k * 3 + 1] = p.y;
        fillPositions[k * 3 + 2] = p.z;
      });
      const indices: number[] = [];
      for (let j = 0; j < pts.length - 2; j++) {
        indices.push(j, j + 1, j + 2);
      }
      const fillGeo = new THREE.BufferGeometry();
      fillGeo.setAttribute("position", new THREE.BufferAttribute(fillPositions, 3));
      fillGeo.setIndex(indices);
      fillGeo.computeVertexNormals();
      root.add(new THREE.Mesh(
        fillGeo,
        new THREE.MeshBasicMaterial({
          color: col, transparent: true, opacity: 0.05, side: THREE.DoubleSide,
        }),
      ));

      // tip node
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        new THREE.MeshBasicMaterial({ color: col }),
      );
      tip.position.copy(tipPt);
      root.add(tip);
      tipNodes.push(tip);

      // tip glow
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.20, 10, 10),
        new THREE.MeshBasicMaterial({
          color: col, transparent: true, opacity: 0.10, side: THREE.BackSide,
        }),
      );
      glow.position.copy(tipPt);
      root.add(glow);
      tipGlows.push(glow);
    }

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

    makeRing(2.55,  0.35,  0.00, 0.12);
    makeRing(1.65, -0.22,  0.15, 0.07);
    makeRing(3.10,  0.10, -0.12, 0.05);

    // ── traveling dot (agent "signal" moving around the outer ring) ────────
    const traveler = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: AMBER }),
    );
    scene.add(traveler); // scene not root — stays in world space

    const travelerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.15, side: THREE.BackSide }),
    );
    scene.add(travelerGlow);

    // ── floating background particles ─────────────────────────────────────
    const N  = 220;
    const fp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 2.2 + Math.random() * 3.8;
      fp[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
      fp[i * 3 + 1] = (Math.random() - 0.5) * 5;
      fp[i * 3 + 2] = Math.cos(phi) * r;
    }
    const fpGeo = new THREE.BufferGeometry();
    fpGeo.setAttribute("position", new THREE.BufferAttribute(fp, 3));
    root.add(new THREE.Points(fpGeo, new THREE.PointsMaterial({
      color: ORANGE, size: 0.032, transparent: true, opacity: 0.38,
    })));

    // ── mouse tracking ────────────────────────────────────────────────────
    const mouse  = { x: 0, y: 0 };
    const lerped = { x: 0, y: 0 };

    const onMM = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      mouse.y = -((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMM);

    // ── resize ────────────────────────────────────────────────────────────
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

      // smooth mouse lerp
      lerped.x += (mouse.x * 0.28 - lerped.x) * 0.04;
      lerped.y += (mouse.y * 0.20 - lerped.y) * 0.04;

      // rotation: slow auto-spin + mouse parallax
      root.rotation.y = t * 0.22 + lerped.x;
      root.rotation.x = lerped.y * 0.38;

      // core pulse
      const pulse = 1 + Math.sin(t * 2.8) * 0.07;
      core.scale.setScalar(pulse);

      // tip nodes twinkle independently
      tipNodes.forEach((n, i) => {
        const s = 1 + Math.sin(t * 3.2 + i * 1.26) * 0.18;
        n.scale.setScalar(s);
        tipGlows[i].scale.setScalar(s * 1.1);
      });

      // traveler: orbit in world space at tilt matching ring 1
      const tiltX = 0.35;
      const tR    = 2.55;
      const ta    = t * 0.9;
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
