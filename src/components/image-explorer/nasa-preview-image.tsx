"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

type PreviewState = "loading" | "loaded" | "failed";

export function NasaPreviewImage({
  src,
  alt,
  sizes,
  fit = "cover",
  priority = false,
  onFailure,
}: {
  src?: string;
  alt: string;
  sizes: string;
  fit?: "cover" | "contain";
  priority?: boolean;
  onFailure?: () => void;
}) {
  const [state, setState] = useState<PreviewState>(src ? "loading" : "failed");

  useEffect(() => {
    setState(src ? "loading" : "failed");
  }, [src]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-cosmos-night">
      {state === "loading" ? (
        <div
          className="cosmos-skeleton absolute inset-0"
          aria-label={`Loading preview for ${alt}`}
          role="status"
        />
      ) : null}

      {src && state !== "failed" ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes={sizes}
          // NASA URLs are server-validated; direct delivery avoids deployment image-optimizer failures.
          unoptimized
          onLoad={() => setState("loaded")}
          onError={() => {
            setState("failed");
            onFailure?.();
          }}
          className={`${fit === "cover" ? "object-cover" : "object-contain"} transition-opacity duration-300 ${
            state === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}

      {state === "failed" ? (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_38%_28%,rgba(56,189,248,0.18),transparent_30%),linear-gradient(145deg,#101827,#03040a)] p-6">
          <div className="text-center text-cosmos-frost">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-oxygen-400/20 bg-oxygen-400/10">
              <ImageOff className="h-5 w-5 text-oxygen-400" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold">Preview unavailable</p>
            <p className="mt-1 text-xs text-cosmos-mist">Open the NASA record for source media</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
