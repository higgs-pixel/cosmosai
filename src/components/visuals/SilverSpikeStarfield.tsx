"use client";

import { useEffect, useRef } from "react";

/**
 * SilverSpikeStarfield — premium 4-spike ✦ star field.
 * Low density, very low glow brightness.
 * Stars slowly drift, independently twinkle, and wrap seamlessly.
 */
interface Star {
  x: number;
  y: number;
  size: number;      // spike length px
  vx: number;
  vy: number;
  phase: number;
  tSpeed: number;
  baseAlpha: number;
  tRange: number;
  rot: number;
}

export function SilverSpikeStarfield({
  className = "",
  density = "medium",
}: {
  className?: string;
  density?: "low" | "medium" | "high";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let W = 0, H = 0, dpr = 1;
    let stars: Star[] = [];

    // Counts per million pixels — kept very low
    const cntPerMpx = density === "low" ? 6 : density === "high" ? 18 : 11;

    const init = (w: number, h: number) => {
      const count = Math.max(12, Math.min(48, Math.round((w * h / 1_000_000) * cntPerMpx)));
      stars = Array.from({ length: count }, () => {
        // 3 size tiers: tiny 25%, mid 60%, bright 15%
        const r = Math.random();
        let size: number, baseAlpha: number, tRange: number;
        if (r < 0.25) {
          // tiny — barely visible
          size = 4 + Math.random() * 3;
          baseAlpha = 0.06 + Math.random() * 0.08;
          tRange = 0.04;
        } else if (r < 0.85) {
          // mid
          size = 7 + Math.random() * 6;
          baseAlpha = 0.10 + Math.random() * 0.10;
          tRange = 0.07;
        } else {
          // hero — slightly brighter, still dim
          size = 13 + Math.random() * 6;
          baseAlpha = 0.14 + Math.random() * 0.10;
          tRange = 0.10;
        }
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          size,
          vx: (Math.random() - 0.5) * 0.06,
          vy: -0.02 - Math.random() * 0.05,
          phase: Math.random() * Math.PI * 2,
          tSpeed: 0.008 + Math.random() * 0.016,
          baseAlpha,
          tRange,
          rot: (Math.random() - 0.5) * 0.15, // subtle ±8° tilt
        };
      });
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init(W, H);
    };

    resize();
    window.addEventListener("resize", resize);

    let paused = false;
    const onVis = () => { paused = document.hidden; };
    document.addEventListener("visibilitychange", onVis);

    /** Draw one ✦ 4-spike star */
    const draw = (s: Star, alpha: number, scale: number) => {
      const sz = s.size * scale;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);

      // ── Soft halo glow ──────────────────────────────────────────
      const haloR = sz * 1.6;
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
      halo.addColorStop(0, `rgba(255,255,255,${alpha * 0.55})`);
      halo.addColorStop(0.4, `rgba(224,232,242,${alpha * 0.18})`);
      halo.addColorStop(1, "rgba(200,215,235,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, haloR, 0, Math.PI * 2);
      ctx.fill();

      // ── Vertical spike ──────────────────────────────────────────
      const nw = Math.max(0.5, sz * 0.075);
      const vg = ctx.createLinearGradient(0, -sz, 0, sz);
      vg.addColorStop(0, "rgba(210,225,240,0)");
      vg.addColorStop(0.35, `rgba(235,242,252,${alpha * 0.5})`);
      vg.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.9})`);
      vg.addColorStop(0.65, `rgba(235,242,252,${alpha * 0.5})`);
      vg.addColorStop(1, "rgba(210,225,240,0)");
      ctx.fillStyle = vg;
      ctx.beginPath();
      ctx.moveTo(0, -sz); ctx.lineTo(nw, 0); ctx.lineTo(0, sz); ctx.lineTo(-nw, 0);
      ctx.closePath();
      ctx.fill();

      // ── Horizontal spike ─────────────────────────────────────────
      const hg = ctx.createLinearGradient(-sz, 0, sz, 0);
      hg.addColorStop(0, "rgba(210,225,240,0)");
      hg.addColorStop(0.35, `rgba(235,242,252,${alpha * 0.5})`);
      hg.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.9})`);
      hg.addColorStop(0.65, `rgba(235,242,252,${alpha * 0.5})`);
      hg.addColorStop(1, "rgba(210,225,240,0)");
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(-sz, 0); ctx.lineTo(0, nw); ctx.lineTo(sz, 0); ctx.lineTo(0, -nw);
      ctx.closePath();
      ctx.fill();

      // ── Diamond core ─────────────────────────────────────────────
      const cr = sz * 0.45;
      ctx.beginPath();
      ctx.moveTo(0, -cr);
      ctx.quadraticCurveTo(0, 0, cr, 0);
      ctx.quadraticCurveTo(0, 0, 0, cr);
      ctx.quadraticCurveTo(0, 0, -cr, 0);
      ctx.quadraticCurveTo(0, 0, 0, -cr);
      ctx.closePath();
      ctx.fillStyle = `rgba(248,252,255,${alpha * 0.88})`;
      ctx.fill();

      // ── Central pinpoint ─────────────────────────────────────────
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, alpha * 1.2)})`;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.4, sz * 0.12), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const loop = () => {
      if (!paused) {
        ctx.clearRect(0, 0, W, H);
        for (const s of stars) {
          s.x += s.vx;
          s.y += s.vy;
          s.phase += s.tSpeed;

          const margin = s.size * 2;
          if (s.y < -margin) s.y = H + margin;
          if (s.y > H + margin) s.y = -margin;
          if (s.x < -margin) s.x = W + margin;
          if (s.x > W + margin) s.x = -margin;

          const sinV = Math.sin(s.phase);
          const alpha = Math.max(0.03, s.baseAlpha + sinV * s.tRange);
          const scale = 0.9 + (sinV + 1) * 0.07; // subtle size pulse
          draw(s, alpha, scale);
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 h-screen w-screen ${className}`}
    />
  );
}

export default SilverSpikeStarfield;
