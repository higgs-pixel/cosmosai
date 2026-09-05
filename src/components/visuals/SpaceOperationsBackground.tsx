"use client";

import { useEffect, useRef } from "react";

export function SpaceOperationsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Subtle star particles
    const STAR_COUNT = 90;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.6 + 0.2,
      baseAlpha: Math.random() * 0.6 + 0.2,
      twinkleSpeed: Math.random() * 0.015 + 0.005,
      phase: Math.random() * Math.PI * 2,
    }));

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Smooth mouse follow
      mouseX += (targetMouseX - mouseX) * 0.03;
      mouseY += (targetMouseY - mouseY) * 0.03;

      const parallaxX = (mouseX / width - 0.5) * 18;
      const parallaxY = (mouseY / height - 0.5) * 18;

      ctx.clearRect(0, 0, width, height);

      // Draw faint orbital arcs in the background
      ctx.save();
      ctx.strokeStyle = "rgba(0, 229, 255, 0.04)";
      ctx.lineWidth = 1;

      // Large orbital ring 1
      ctx.beginPath();
      ctx.ellipse(
        width * 0.65 - parallaxX * 0.5,
        height * 0.35 - parallaxY * 0.5,
        width * 0.45,
        height * 0.28,
        Math.PI * -0.22,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // Large orbital ring 2
      ctx.strokeStyle = "rgba(168, 85, 247, 0.03)";
      ctx.beginPath();
      ctx.ellipse(
        width * 0.3 - parallaxX * 0.3,
        height * 0.7 - parallaxY * 0.3,
        width * 0.55,
        height * 0.35,
        Math.PI * 0.18,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();

      // Render stars with subtle twinkle and depth
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.phase += star.twinkleSpeed;
        star.alpha = star.baseAlpha + Math.sin(star.phase) * 0.25;

        const sx = star.x + parallaxX * (star.size * 0.4);
        const sy = star.y + parallaxY * (star.size * 0.4);

        ctx.fillStyle = `rgba(220, 235, 255, ${Math.max(0.1, Math.min(1, star.alpha))})`;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#02040a]">
      {/* Volumetric Nebula Gradients */}
      <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.07)_0%,rgba(2,4,10,0)_70%)] blur-[100px]" />
      <div className="absolute top-[35%] -right-[15%] w-[65vw] h-[65vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.06)_0%,rgba(2,4,10,0)_70%)] blur-[120px]" />
      <div className="absolute -bottom-[20%] left-[20%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.05)_0%,rgba(2,4,10,0)_70%)] blur-[120px]" />

      {/* Dynamic Starfield & Orbital Arcs Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-90" />

      {/* Subtle Noise / Grain Overlay for Physical Depth */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
    </div>
  );
}
