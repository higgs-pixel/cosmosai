"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  baseSize: number;
  vx: number;
  vy: number;
  phase: number;
  twinkleSpeed: number;
  baseAlpha: number;
  twinkleRange: number;
  rotation: number;
  layer: number; // 0 = distant, 1 = mid, 2 = hero
}

interface DustParticle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
  speed: number;
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
    let width = 0;
    let height = 0;
    let dpr = 1;

    let stars: Star[] = [];
    let dust: DustParticle[] = [];

    // Density configuration
    const densityDivisor =
      density === "low" ? 48000 : density === "high" ? 22000 : 32000;

    const initStars = (w: number, h: number) => {
      const targetCount = Math.max(
        35,
        Math.min(85, Math.round((w * h) / densityDivisor))
      );

      stars = Array.from({ length: targetCount }, () => {
        // Distribute layers: 20% distant, 65% mid, 15% hero
        const rand = Math.random();
        let layer = 1;
        let baseSize = 9 + Math.random() * 6; // 9 - 15px

        if (rand < 0.2) {
          layer = 0;
          baseSize = 5 + Math.random() * 3.5; // 5 - 8.5px
        } else if (rand > 0.85) {
          layer = 2;
          baseSize = 16 + Math.random() * 8; // 16 - 24px
        }

        const speedFactor = layer === 0 ? 0.4 : layer === 1 ? 0.75 : 1.1;

        return {
          x: Math.random() * w,
          y: Math.random() * h,
          baseSize,
          vx: ((Math.random() - 0.5) * 0.08) * speedFactor,
          vy: (-0.05 - Math.random() * 0.12) * speedFactor,
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.012 + Math.random() * 0.024,
          baseAlpha:
            layer === 0
              ? 0.25 + Math.random() * 0.25
              : layer === 1
              ? 0.45 + Math.random() * 0.35
              : 0.65 + Math.random() * 0.35,
          twinkleRange:
            layer === 0
              ? 0.15 + Math.random() * 0.15
              : 0.25 + Math.random() * 0.25,
          rotation: (Math.random() - 0.5) * 0.08, // Subtle tilt
          layer,
        };
      });

      // Medium silver micro-dust field to enhance cosmic depth
      const dustCount = Math.max(30, Math.min(60, Math.round((w * h) / 45000)));
      dust = Array.from({ length: dustCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 0.6 + Math.random() * 1.1,
        vx: (Math.random() - 0.5) * 0.04,
        vy: -0.03 - Math.random() * 0.06,
        alpha: 0.15 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.015,
      }));
    };

    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      initStars(width, height);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Render 4-Spike Star shape
    const draw4SpikeStar = (
      x: number,
      y: number,
      baseSize: number,
      alpha: number,
      rot: number,
      layer: number
    ) => {
      ctx.save();
      ctx.translate(x, y);
      if (rot !== 0) ctx.rotate(rot);

      // 1. Silver halo bloom
      const glowRadius = baseSize * (layer === 2 ? 2.2 : 1.7);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
      glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
      glow.addColorStop(0.2, `rgba(226, 232, 240, ${alpha * 0.6})`); // #e2e8f0 silver
      glow.addColorStop(0.5, `rgba(203, 213, 225, ${alpha * 0.2})`); // #cbd5e1 cool silver
      glow.addColorStop(0.85, `rgba(148, 163, 184, ${alpha * 0.05})`);
      glow.addColorStop(1, "rgba(148, 163, 184, 0)");

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Astroid / Curved Diamond Core (✦)
      const coreR = baseSize * 0.55;
      ctx.beginPath();
      ctx.moveTo(0, -coreR);
      ctx.quadraticCurveTo(0, 0, coreR, 0);
      ctx.quadraticCurveTo(0, 0, 0, coreR);
      ctx.quadraticCurveTo(0, 0, -coreR, 0);
      ctx.quadraticCurveTo(0, 0, 0, -coreR);
      ctx.closePath();
      ctx.fillStyle = `rgba(248, 250, 252, ${alpha * 0.95})`; // #f8fafc
      ctx.fill();

      // 3. Extended Slender Vertical Silver Diffraction Spike
      const needleW = Math.max(0.65, baseSize * 0.09);
      const vertSpike = ctx.createLinearGradient(0, -baseSize, 0, baseSize);
      vertSpike.addColorStop(0, "rgba(203, 213, 225, 0)");
      vertSpike.addColorStop(0.3, `rgba(226, 232, 240, ${alpha * 0.55})`);
      vertSpike.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.95})`);
      vertSpike.addColorStop(0.7, `rgba(226, 232, 240, ${alpha * 0.55})`);
      vertSpike.addColorStop(1, "rgba(203, 213, 225, 0)");

      ctx.fillStyle = vertSpike;
      ctx.beginPath();
      ctx.moveTo(0, -baseSize);
      ctx.lineTo(needleW, 0);
      ctx.lineTo(0, baseSize);
      ctx.lineTo(-needleW, 0);
      ctx.closePath();
      ctx.fill();

      // 4. Extended Slender Horizontal Silver Diffraction Spike
      const horizSpike = ctx.createLinearGradient(-baseSize, 0, baseSize, 0);
      horizSpike.addColorStop(0, "rgba(203, 213, 225, 0)");
      horizSpike.addColorStop(0.3, `rgba(226, 232, 240, ${alpha * 0.55})`);
      horizSpike.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.95})`);
      horizSpike.addColorStop(0.7, `rgba(226, 232, 240, ${alpha * 0.55})`);
      horizSpike.addColorStop(1, "rgba(203, 213, 225, 0)");

      ctx.fillStyle = horizSpike;
      ctx.beginPath();
      ctx.moveTo(-baseSize, 0);
      ctx.lineTo(0, needleW);
      ctx.lineTo(baseSize, 0);
      ctx.lineTo(0, -needleW);
      ctx.closePath();
      ctx.fill();

      // 5. Intense pinpoint central sparkle
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 1.25)})`;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, baseSize * 0.14), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    let isVisible = true;
    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Animation Loop
    const loop = () => {
      if (!isVisible) {
        animId = requestAnimationFrame(loop);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Render micro silver dust particles
      for (let i = 0; i < dust.length; i++) {
        const p = dust[i];
        p.x += p.vx;
        p.y += p.vy;
        p.phase += p.speed;

        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentAlpha = p.alpha + Math.sin(p.phase) * 0.15;
        ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0.05, currentAlpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render 4-spike silver twinkling stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Cosmic drift movement
        s.x += s.vx;
        s.y += s.vy;

        // Twinkle phase progression
        s.phase += s.twinkleSpeed;

        // Wrap around screen boundaries seamlessly
        const margin = s.baseSize * 2.5;
        if (s.y < -margin) s.y = height + margin;
        if (s.y > height + margin) s.y = -margin;
        if (s.x < -margin) s.x = width + margin;
        if (s.x > width + margin) s.x = -margin;

        // Calculate dynamic alpha and spike flare scale
        const sinVal = Math.sin(s.phase);
        const currentAlpha = Math.max(
          0.12,
          Math.min(1.0, s.baseAlpha + sinVal * s.twinkleRange)
        );

        // Flaring spike scale during bright twinkle peaks
        const currentScale = 0.88 + (sinVal + 1) * 0.15;
        const currentSize = s.baseSize * currentScale;

        draw4SpikeStar(s.x, s.y, currentSize, currentAlpha, s.rotation, s.layer);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
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
