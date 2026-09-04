"use client";

import React, { useMemo } from "react";
import QRCode from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * 100% Native Inline SVG QR Code Generator (Zero PNG Image Files, Zero <img> Tags).
 * Dynamically computes Reed-Solomon QR matrix vectors synchronously per session URL.
 */
export function QRCodeSVG({ value, size = 180, className = "" }: QRCodeProps) {
  const qrData = useMemo(() => {
    if (!value) return null;
    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
      const moduleCount = qr.modules.size;
      const data = qr.modules.data;
      const margin = 2; // quiet zone in module units

      let pathStr = "";
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (data[r * moduleCount + c] === 1) {
            const x = c + margin;
            const y = r + margin;
            pathStr += `M${x},${y}h1v1h-1z `;
          }
        }
      }

      return {
        viewBoxSize: moduleCount + margin * 2,
        path: pathStr,
      };
    } catch (err) {
      console.error("Native SVG QR Generation Error:", err);
      return null;
    }
  }, [value]);

  if (!qrData) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center text-xs font-mono text-slate-500 animate-pulse bg-white rounded-xl p-2"
      >
        Generating SVG QR...
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center justify-center p-3 rounded-xl bg-white border-2 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.3)] ${className}`}>
      <svg
        viewBox={`0 0 ${qrData.viewBoxSize} ${qrData.viewBoxSize}`}
        width={size}
        height={size}
        className="rounded-md select-none w-full h-full"
        shapeRendering="crispEdges"
      >
        <rect x="0" y="0" width={qrData.viewBoxSize} height={qrData.viewBoxSize} fill="#ffffff" />
        <path d={qrData.path} fill="#000000" />
      </svg>
    </div>
  );
}
