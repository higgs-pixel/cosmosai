"use client";

import { useRef, useState, HTMLAttributes, forwardRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export interface SpaceTechCardProps extends HTMLAttributes<HTMLDivElement> {
  moduleTag?: string;
  statusText?: string;
  statusColor?: "cyan" | "emerald" | "amber" | "purple";
  scanLine?: boolean;
  tilt?: boolean;
  glow?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const SpaceTechCard = forwardRef<HTMLDivElement, SpaceTechCardProps>(
  (
    {
      moduleTag,
      statusText,
      statusColor = "cyan",
      scanLine = false,
      tilt = false,
      glow = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const cardRef = useRef<HTMLDivElement | null>(null);

    // 3D Tilt Physics using Framer Motion springs
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 20, stiffness: 200 };
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7, -7]), springConfig);
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), springConfig);

    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!tilt || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      mouseX.set(0);
      mouseY.set(0);
    };

    const statusColors = {
      cyan: "text-cyan-400 border-cyan-400/40 bg-cyan-500/10",
      emerald: "text-emerald-400 border-emerald-400/40 bg-emerald-500/10",
      amber: "text-amber-400 border-amber-400/40 bg-amber-500/10",
      purple: "text-purple-400 border-purple-400/40 bg-purple-500/10",
    };

    const dotColors = {
      cyan: "bg-cyan-400 shadow-[0_0_8px_#00e5ff]",
      emerald: "bg-emerald-400 shadow-[0_0_8px_#10b981]",
      amber: "bg-amber-400 shadow-[0_0_8px_#f59e0b]",
      purple: "bg-purple-400 shadow-[0_0_8px_#a855f7]",
    };

    return (
      <div
        style={{ perspective: tilt ? 1200 : undefined }}
        className="w-full"
      >
        <motion.div
          ref={(node) => {
            cardRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            transformStyle: tilt ? "preserve-3d" : undefined,
            rotateX: tilt ? rotateX : 0,
            rotateY: tilt ? rotateY : 0,
          }}
          className={`
            relative overflow-hidden rounded-2xl
            bg-[#050914]/85 backdrop-blur-2xl
            border border-cyan-500/20
            transition-shadow duration-300
            ${glow || isHovered ? "shadow-[0_0_35px_rgba(0,229,255,0.14)] border-cyan-500/40" : "shadow-[0_12px_32px_rgba(0,0,0,0.5)]"}
            ${className}
          `}
          {...(props as any)}
        >
          {/* Holographic grid background texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-screen bg-[linear-gradient(to_right,#00e5ff_1px,transparent_1px),linear-gradient(to_bottom,#00e5ff_1px,transparent_1px)] bg-[size:24px_24px]"
          />

          {/* Laser-etched HUD corner reticles */}
          {/* Top-Left Reticle */}
          <div className="absolute top-2 left-2 pointer-events-none z-20 flex gap-0.5">
            <span className="w-2.5 h-[1.5px] bg-cyan-400/70" />
            <span className="w-[1.5px] h-2.5 -ml-2.5 bg-cyan-400/70" />
          </div>
          {/* Top-Right Reticle */}
          <div className="absolute top-2 right-2 pointer-events-none z-20 flex flex-col items-end">
            <span className="w-2.5 h-[1.5px] bg-cyan-400/70" />
            <span className="w-[1.5px] h-2.5 bg-cyan-400/70" />
          </div>
          {/* Bottom-Left Reticle */}
          <div className="absolute bottom-2 left-2 pointer-events-none z-20 flex flex-col items-start justify-end">
            <span className="w-[1.5px] h-2.5 bg-cyan-400/70" />
            <span className="w-2.5 h-[1.5px] bg-cyan-400/70" />
          </div>
          {/* Bottom-Right Reticle */}
          <div className="absolute bottom-2 right-2 pointer-events-none z-20 flex flex-col items-end justify-end">
            <span className="w-[1.5px] h-2.5 bg-cyan-400/70" />
            <span className="w-2.5 h-[1.5px] bg-cyan-400/70" />
          </div>

          {/* Optional Scanning Laser Line */}
          {scanLine && (
            <motion.div
              animate={{ y: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="pointer-events-none absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent z-10"
            />
          )}

          {/* Optional Module Top Header Tag */}
          {(moduleTag || statusText) && (
            <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-white/[0.06] text-[10px] font-mono select-none">
              {moduleTag && (
                <span className="text-cyan-400/80 font-bold tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                  {moduleTag}
                </span>
              )}
              {statusText && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border font-bold uppercase ${statusColors[statusColor]}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColors[statusColor]}`} />
                  {statusText}
                </span>
              )}
            </div>
          )}

          {/* Inner Card Content */}
          <div className="relative z-10">{children}</div>
        </motion.div>
      </div>
    );
  }
);

SpaceTechCard.displayName = "SpaceTechCard";
export default SpaceTechCard;
