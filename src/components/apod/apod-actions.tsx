"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Check, Download, Loader2, Share2 } from "lucide-react";
import { getSavedDiscoveries, saveDiscoveryToSupabase } from "@/lib/saved-discoveries";
import type { ApodEntry } from "@/services/nasa";

type ApodActionsProps = {
  apod: ApodEntry;
};

export function ApodActions({ apod }: ApodActionsProps) {
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [cardGenerated, setCardGenerated] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const discoveryId = `apod-${apod.date}`;

  const sharePayload = useMemo(
    () => ({
      title: `COSMOS AI | ${apod.title}`,
      text: `Explore NASA's Astronomy Picture of the Day: ${apod.title}`,
      url: typeof window === "undefined" ? "" : window.location.href,
    }),
    [apod.title],
  );

  useEffect(() => {
    let active = true;
    void getSavedDiscoveries().then((items) => {
      if (active) setSaved(items.some((item) => item.id === discoveryId));
    });

    return () => {
      active = false;
    };
  }, [discoveryId]);

  async function shareApod() {
    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        setShared(true);
        return;
      }

      if (navigator.clipboard && sharePayload.url) {
        await navigator.clipboard.writeText(sharePayload.url);
        setShared(true);
      }
    } catch {
      setShared(false);
    }
  }

  function readSavedApods() {
    try {
      const savedApods = JSON.parse(localStorage.getItem("cosmos:saved-apods") ?? "[]");
      return Array.isArray(savedApods) ? (savedApods as ApodEntry[]) : [];
    } catch {
      return [];
    }
  }

  function saveApod() {
    try {
      const savedApods = readSavedApods();
      const nextSavedApods = [
        apod,
        ...savedApods.filter((entry) => entry.date !== apod.date),
      ].slice(0, 24);

      localStorage.setItem("cosmos:saved-apods", JSON.stringify(nextSavedApods));
      void saveDiscoveryToSupabase({
        id: discoveryId,
        type: "apod",
        title: apod.title,
        subtitle: apod.date,
        description: apod.explanation,
        imageUrl: apod.media_type === "image" ? apod.url : undefined,
        href: "/apod",
        source: "NASA APOD",
        savedAt: new Date().toISOString(),
        metadata: {
          date: apod.date,
          copyright: apod.copyright,
          mediaType: apod.media_type,
        },
      });
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  function wrapCanvasText(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ) {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;

      if (context.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }

      if (lines.length === maxLines) break;
    }

    if (line && lines.length < maxLines) {
      lines.push(line);
    }

    lines.forEach((lineText, index) => {
      const suffix = index === maxLines - 1 && words.join(" ").length > lines.join(" ").length ? "..." : "";
      context.fillText(`${lineText}${suffix}`, x, y + index * lineHeight);
    });
  }

  function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Unable to generate share card."));
      }, "image/png");
    });
  }

  async function loadCanvasImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function drawImageCover(
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    width: number,
    height: number,
  ) {
    const imageRatio = image.width / image.height;
    const canvasRatio = width / height;
    const drawHeight = imageRatio > canvasRatio ? height : width / imageRatio;
    const drawWidth = imageRatio > canvasRatio ? height * imageRatio : width;
    const drawX = (width - drawWidth) / 2;
    const drawY = (height - drawHeight) / 2;

    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  async function createShareCardBlob(includeImage: boolean) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to initialize share card.");
    }

    const gradient = context.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, "#050713");
    gradient.addColorStop(0.48, "#0b1023");
    gradient.addColorStop(1, "#06141f");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1200, 630);

    if (includeImage && apod.media_type === "image" && (apod.hdurl || apod.url)) {
      const image = await loadCanvasImage(apod.hdurl || apod.url);
      drawImageCover(context, image, 1200, 630);
    }

    const overlay = context.createLinearGradient(0, 0, 1200, 630);
    overlay.addColorStop(0, "rgba(3, 4, 10, 0.28)");
    overlay.addColorStop(0.55, "rgba(3, 4, 10, 0.42)");
    overlay.addColorStop(1, "rgba(3, 4, 10, 0.92)");
    context.fillStyle = overlay;
    context.fillRect(0, 0, 1200, 630);

    context.fillStyle = "rgba(255, 255, 255, 0.16)";
    context.fillRect(72, 72, 180, 1);
    context.fillRect(72, 558, 300, 1);

    context.fillStyle = "#7dd3fc";
    context.font = "700 24px Arial, sans-serif";
    context.fillText("COSMOS AI | NASA APOD", 72, 112);

    context.fillStyle = "rgba(255, 255, 255, 0.72)";
    context.font = "700 20px Arial, sans-serif";
    context.fillText(apod.date, 72, 154);

    context.fillStyle = "#ffffff";
    context.font = "700 62px Arial, sans-serif";
    wrapCanvasText(context, apod.title, 72, 390, 760, 70, 3);

    context.fillStyle = "rgba(255, 255, 255, 0.74)";
    context.font = "400 22px Arial, sans-serif";
    wrapCanvasText(context, `Explore the story at ${window.location.origin}/apod`, 72, 532, 760, 30, 2);

    return canvasToBlob(canvas);
  }

  async function generateShareCard() {
    setIsGeneratingCard(true);
    setCardGenerated(false);

    try {
      let blob: Blob;

      try {
        blob = await createShareCardBlob(true);
      } catch {
        blob = await createShareCardBlob(false);
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `cosmos-apod-${apod.date}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setCardGenerated(true);
    } catch {
      setCardGenerated(false);
    } finally {
      setIsGeneratingCard(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <button
        type="button"
        onClick={shareApod}
        className="glass-button group inline-flex h-12 items-center justify-center gap-3 rounded-md px-5 text-sm font-bold text-cosmos-white transition hover:border-oxygen-400/45 hover:bg-oxygen-400/12 hover:shadow-glow-oxygen focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
      >
        {shared ? <Check className="h-4 w-4 text-aurora-400" /> : <Share2 className="h-4 w-4 text-oxygen-400" />}
        {shared ? "Link ready" : "Share briefing"}
      </button>

      <button
        type="button"
        onClick={generateShareCard}
        disabled={isGeneratingCard}
        className="glass-button group inline-flex h-12 items-center justify-center gap-3 rounded-md px-5 text-sm font-bold text-cosmos-white transition hover:border-solar-300/45 hover:bg-solar-300/12 disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solar-300"
      >
        {isGeneratingCard ? (
          <Loader2 className="h-4 w-4 animate-spin text-solar-300" />
        ) : cardGenerated ? (
          <Check className="h-4 w-4 text-aurora-400" />
        ) : (
          <Download className="h-4 w-4 text-solar-300" />
        )}
        {isGeneratingCard ? "Creating card" : cardGenerated ? "Card saved" : "Share card"}
      </button>

      <button
        type="button"
        onClick={saveApod}
        className="group inline-flex h-12 items-center justify-center gap-3 rounded-md bg-oxygen-500 px-5 text-sm font-bold text-white shadow-glow-oxygen transition hover:bg-oxygen-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
      >
        {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        {saved ? "Saved" : "Save to collection"}
      </button>
    </div>
  );
}
