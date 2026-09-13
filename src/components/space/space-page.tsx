"use client";

import { useCallback, useRef } from "react";
import { SpaceNavbar } from "./space-navbar";
import { SpaceHero } from "./space-hero";

export function SpacePage() {
  const mouseRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    mouseRef.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(((e.clientY / window.innerHeight) * 2 - 1)),
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#020b18",
        fontFamily: "system-ui, 'SF Pro Display', -apple-system, sans-serif",
      }}
      onMouseMove={handleMouseMove}
    >
      <SpaceNavbar />
      <SpaceHero mouseRef={mouseRef} />
    </div>
  );
}
