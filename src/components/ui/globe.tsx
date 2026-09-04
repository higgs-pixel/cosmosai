"use client";

import React from "react";

type GlobeProps = {
  className?: string;
  imageUrl?: string;
  sizeClassName?: string;
};

const stars = [
  "left-[8%] top-[18%] animate-[cosmosGlobeTwinkle_3s_ease-in-out_infinite]",
  "left-[18%] top-[76%] animate-[cosmosGlobeTwinkle_2.3s_ease-in-out_infinite]",
  "left-[78%] top-[14%] animate-[cosmosGlobeTwinkle_4s_ease-in-out_infinite]",
  "left-[88%] top-[66%] animate-[cosmosGlobeTwinkle_2.8s_ease-in-out_infinite]",
  "left-[38%] top-[10%] animate-[cosmosGlobeTwinkle_3.6s_ease-in-out_infinite]",
  "left-[62%] top-[86%] animate-[cosmosGlobeTwinkle_2s_ease-in-out_infinite]",
  "left-[48%] top-[28%] animate-[cosmosGlobeTwinkle_4.4s_ease-in-out_infinite]",
  "left-[24%] top-[44%] animate-[cosmosGlobeTwinkle_2.6s_ease-in-out_infinite]",
];

export default function Globe({
  className = "",
  imageUrl = "/images/earth-dashboard/earth-main.jpg",
  sizeClassName = "h-[min(62vw,520px)] w-[min(62vw,520px)]",
}: GlobeProps) {
  return (
    <div className={`cosmos-globe-stage relative grid min-h-[360px] place-items-center overflow-hidden ${className}`}>
      <style jsx>{`
        @keyframes cosmosGlobeRotate {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes cosmosGlobeClouds {
          0% {
            transform: translate3d(-2%, 0, 0) rotate(0deg);
          }
          100% {
            transform: translate3d(2%, 0, 0) rotate(360deg);
          }
        }

        @keyframes cosmosGlobeTwinkle {
          0%,
          100% {
            opacity: 0.16;
          }
          50% {
            opacity: 0.92;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cosmos-globe-stage * {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,0.14),transparent_34%),radial-gradient(circle_at_22%_40%,rgba(59,130,246,0.12),transparent_28%),linear-gradient(180deg,rgba(3,7,18,0.28),rgba(3,4,10,0.82))]"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {stars.map((position) => (
          <span key={position} className={`absolute h-1 w-1 rounded-full bg-cosmos-white/80 ${position}`} />
        ))}
      </div>

      <div
        className={`relative isolate rounded-full ${sizeClassName}`}
        aria-label="Rotating Earth globe with atmosphere and starfield"
        role="img"
      >
        <div
          className="absolute inset-0 rounded-full bg-cover bg-center shadow-[0_0_38px_rgba(103,232,249,0.28),-12px_0_18px_rgba(195,244,255,0.58)_inset,18px_3px_34px_rgba(0,0,0,0.88)_inset,-28px_-4px_46px_rgba(103,232,249,0.42)_inset,210px_0_72px_rgba(0,0,0,0.62)_inset,130px_0_52px_rgba(0,0,0,0.82)_inset]"
          style={{
            backgroundImage: `url('${imageUrl}')`,
            backgroundSize: "200% 100%",
            animation: "cosmosGlobeRotate 46s linear infinite",
          }}
        />
        <div
          className="absolute inset-[-1%] rounded-full opacity-55 mix-blend-screen"
          style={{
            background:
              "radial-gradient(circle at 42% 34%, rgba(255,255,255,0.42), transparent 0 7%, transparent 28%), repeating-radial-gradient(ellipse at 48% 42%, rgba(255,255,255,0.12) 0 2px, transparent 3px 14px)",
            filter: "blur(0.5px)",
            animation: "cosmosGlobeClouds 72s linear infinite",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 rounded-full bg-[linear-gradient(96deg,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.54)_24%,transparent_48%,rgba(255,255,255,0.08)_68%,rgba(0,0,0,0.26)_100%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-[-2%] rounded-full border border-oxygen-300/28 shadow-[0_0_46px_rgba(56,189,248,0.42),0_0_120px_rgba(14,165,233,0.16)]"
          aria-hidden="true"
        />
        <div
          className="absolute -inset-[13%] rounded-full border border-oxygen-400/12"
          style={{ transform: "rotateX(68deg) rotateZ(-18deg)" }}
          aria-hidden="true"
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#020617] via-[#020617]/72 to-transparent" />
    </div>
  );
}
