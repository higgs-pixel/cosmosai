"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Standard, 100% compliant scannable QR Code generator using industry-standard Reed-Solomon QR library.
 * Renders high-contrast, instantly scannable vector QR codes dynamically generated from the provided session URL.
 */
export function QRCodeSVG({ value, size = 200, className = "" }: QRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    if (!value) return;

    QRCode.toDataURL(value, {
      margin: 1,
      width: Math.max(256, size * 2),
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => {
        console.error("QR Code Generation Error:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  return (
    <div className={`relative flex flex-col items-center justify-center p-3 rounded-xl bg-white border-2 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.3)] ${className}`}>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`Dynamic QR Code for ${value}`}
          width={size}
          height={size}
          className="rounded-md object-contain select-none"
        />
      ) : (
        <div style={{ width: size, height: size }} className="flex items-center justify-center text-xs font-mono text-slate-500 animate-pulse">
          Generating QR...
        </div>
      )}
    </div>
  );
}
