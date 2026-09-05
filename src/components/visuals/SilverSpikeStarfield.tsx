"use client";

import { useEffect, useRef } from "react";

/** 
 * CosmosDriftField — minimal deep-space ambient starfield.
 * Very low density, ultra-dim, slow-drifting pure white pinpoints.
 * No spike shapes — just subtle round stars with a barely-visible halo glow,
 * independent twinkle phases, and gentle upward parallax drift.
 */

interface Particle {
  x: number;
  y: number;
  r: number;         // base radius px
  vx: number;
  vy: number;
  phase: number;
  tSpeed: number;    // twinkle speed
  peak: number;      // peak alpha
  tRange: number;    // twinkle amplitude
  halo: number;      // halo radius multiplier
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

    let particles: Particle[] = [];

    // Very low density — tiny count per screen area
    const countPerMpx = density === "low" ? 10 : density === "high" ? 22 : 15;

    const init = (w: number, h: number) => {
      const count = Math.max(18, Math.min(55, Math.round((w * h / 1_000_000) * countPerMpx)));
      particles = Array.from({ length: count }, () => {
        const r = 0.4 + Math.random() * 1.2; // very tiny: 0.4 – 1.6px
        const peak = 0.06 + Math.random() * 0.18; // very dim: max alpha 0.06–0.24
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r,
          vx: (Math.random() - 0.5) * 0.045,
          vy: -0.02 - Math.random() * 0.055, // slow upward drift
          phase: Math.random() * Math.PI * 2,
          tSpeed: 0.006 + Math.random() * 0.014,
          peak,
          tRange: peak * 0.45, // twinkle is ±45% of peak alpha
          halo: 3.5 + Math.random() * 3.5, // halo radius = r × halo
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

    const loop = () => {
      if (!paused) {
        ctx.clearRect(0, 0, W, H);

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.phase += p.tSpeed;

          // Seamless wrap
          const margin = p.r * p.halo + 2;
          if (p.y < -margin) p.y = H + margin;
          if (p.y > H + margin) p.y = -margin;
          if (p.x < -margin) p.x = W + margin;
          if (p.x > W + margin) p.x = -margin;

          const alpha = Math.max(0.02, p.peak + Math.sin(p.phase) * p.tRange);

          // Soft halo
          const haloR = p.r * p.halo;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
          g.addColorStop(0, `rgba(255,255,255,${alpha})`);
          g.addColorStop(0.35, `rgba(230,236,245,${alpha * 0.35})`);
          g.addColorStop(1, "rgba(200,212,228,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2);
          ctx.fill();

          // Sharp pinpoint core
          ctx.fillStyle = `rgba(255,255,255,${Math.min(1, alpha * 1.5)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.35, p.r * 0.45), 0, Math.PI * 2);
          ctx.fill();
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
