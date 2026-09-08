"use client";

import dynamic from "next/dynamic";
import type { MutableRefObject } from "react";
import Link from "next/link";
import { SpaceLabels } from "./space-labels";

const SpaceCanvas = dynamic(
  () => import("./space-canvas").then((m) => m.SpaceCanvas),
  { ssr: false, loading: () => null },
);

type SpaceHeroProps = {
  mouseRef: MutableRefObject<{ x: number; y: number }>;
};

export function SpaceHero({ mouseRef }: SpaceHeroProps) {
  return (
    <section
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        minHeight: "700px",
        overflow: "hidden",
        background: "#020b18",
      }}
    >
      {/* ── 3D Canvas fills entire viewport ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <SpaceCanvas mouseRef={mouseRef} />
      </div>

      {/* ── Floating science labels ── */}
      <SpaceLabels />

      {/* ── Hero title — upper-middle ── */}
      <div
        style={{
          position: "absolute",
          top: "118px",
          left: "27vw",
          zIndex: 20,
          pointerEvents: "none",
          maxWidth: "min(640px, 45vw)",
        }}
      >
        {/* First line — gradient cosmic text */}
        <p
          style={{
            fontSize: "clamp(12px, 1.1vw, 15px)",
            fontWeight: 800,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            margin: "0 0 8px",
            background: "linear-gradient(90deg, #7ab4f5 0%, #c4dcff 60%, #e8f2ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1.2,
          }}
        >
          ASTRO-LEARN (COSMOS AI):
        </p>

        {/* Main heading */}
        <h1
          style={{
            fontSize: "clamp(28px, 3.2vw, 50px)",
            fontWeight: 700,
            lineHeight: 1.18,
            color: "#eef4ff",
            textShadow: "0 2px 24px rgba(0,0,0,0.85), 0 0 60px rgba(10,40,100,0.5)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Your Deep Guide
          <br />
          to the Cosmos
        </h1>
      </div>

      {/* ── CTA — bottom-center ── */}
      <div
        style={{
          position: "absolute",
          bottom: "58px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          textAlign: "center",
        }}
      >
        <Link
          href="/solar-system"
          style={{
            display: "inline-block",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(170, 205, 255, 0.85)",
            textDecoration: "none",
            paddingBottom: "5px",
            borderBottom: "1px solid rgba(100,160,255,0.38)",
            transition: "color 0.22s, border-color 0.22s",
          }}
        >
          Call to Action
        </Link>
      </div>
    </section>
  );
}
