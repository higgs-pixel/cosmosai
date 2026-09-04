"use client";

import { useEffect, useRef, useState } from "react";
import {
  homepageAnimationShouldRun,
  keepHomepageVideoPlaying,
  homepageMotionAllowed,
  type HomepageVideoSource,
} from "./homepage-contract";

type OptimizedVideoProps = {
  sources: HomepageVideoSource;
  className?: string;
  poster: string;
  priority?: boolean;
};

export function OptimizedVideo({
  sources,
  className = "",
  poster,
  priority = false,
}: OptimizedVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nearViewport, setNearViewport] = useState(priority);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const hasSources = Boolean(sources.webmUrl || sources.mp4Url);
  const shouldPlay = homepageAnimationShouldRun(
    motionAllowed,
    priority || nearViewport,
  );

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(homepageMotionAllowed(motionQuery.matches));
    update();
    motionQuery.addEventListener("change", update);
    return () => motionQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || priority || !hasSources) return;
    const scrollContainer = container.closest(".cosmos-aryan-home");

    const observer = new IntersectionObserver(([entry]) => {
      setNearViewport(entry.isIntersecting);
    }, { root: scrollContainer, rootMargin: "50% 0px" });
    observer.observe(container);
    return () => observer.disconnect();
  }, [hasSources, priority]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!shouldPlay || !hasSources) {
      video.pause();
      video.load();
      return;
    }

    video.load();
    return keepHomepageVideoPlaying(video, true);
  }, [hasSources, shouldPlay]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (!video) return;
      video.pause();
      video.removeAttribute("src");
      while (video.firstChild) video.removeChild(video.firstChild);
      video.load();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-0 h-full w-full bg-cover bg-center pointer-events-none ${className}`}
      style={{ backgroundImage: `url(${poster})` }}
      data-video-configured={hasSources ? "true" : "false"}
    >
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        preload={priority ? "metadata" : "none"}
        poster={poster}
        crossOrigin="anonymous"
        aria-hidden="true"
        className="h-full w-full object-cover"
      >
        {shouldPlay && sources.webmUrl ? (
          <source src={sources.webmUrl} type="video/webm" />
        ) : null}
        {shouldPlay && sources.mp4Url ? (
          <source src={sources.mp4Url} type="video/mp4" />
        ) : null}
      </video>
    </div>
  );
}
