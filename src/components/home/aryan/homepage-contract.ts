export const homepageNavigationLinks = [
  { label: "Earth", href: "/earth" },
  { label: "Orbit", href: "/orbit" },
  { label: "Briefing", href: "/briefing" },
  { label: "Research", href: "/spacepedia" },
  { label: "Blog", href: "/blog" },
] as const;

export const homepageOfferings = [
  {
    id: "01",
    icon: "🔭",
    title: "Explore",
    content: "Navigate Earth, planetary systems, NASA imagery, missions, and live cosmic data.",
    cta: "Explore NASA imagery ↗",
    href: "/image-explorer",
    image: "/home/aryan/explore.webp",
  },
  {
    id: "02",
    icon: "💬",
    title: "Ask COSMOS",
    content: "Conversational space research assistant backed by real-time web retrieval and scientific paper index.",
    cta: "Ask COSMOS AI ↗",
    href: "/ask",
    image: "/home/aryan/ask.webp",
  },
  {
    id: "03",
    icon: "📖",
    title: "Research",
    content: "Discover papers, institutions, open-access studies, and emerging scientific work through one research layer.",
    cta: "Open research layer ↗",
    href: "/spacepedia",
    image: "/home/aryan/research.webp",
  },
  {
    id: "04",
    icon: "📈",
    title: "Observe",
    content: "Follow Earth conditions, space weather, asteroids, launches, and astronomical events as they develop.",
    cta: "Enter Mission Control ↗",
    href: "/mission-control",
    image: "/home/aryan/observe.webp",
  },
] as const;

export const homepagePlaceholders = [
  { label: "Privacy", enabled: false, href: undefined },
  { label: "Terms", enabled: false, href: undefined },
] as const;

export type HomepageSharePlatform = "whatsapp" | "x" | "linkedin" | "facebook" | "copy";

export function buildHomepageShareUrl(
  platform: Exclude<HomepageSharePlatform, "copy">,
  pageUrl: string,
  title: string,
) {
  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedTitle = encodeURIComponent(title);

  switch (platform) {
    case "whatsapp":
      return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }
}

export function homepageArchiveDestination(sourceUrl?: string) {
  return sourceUrl || "/image-explorer";
}

export function homepageGalleryGestureIsDrag(distance: number) {
  return Math.abs(distance) > 6;
}

export function homepageMotionAllowed(prefersReducedMotion: boolean) {
  return !prefersReducedMotion;
}

export function homepageAnimationShouldRun(
  motionAllowed: boolean,
  nearViewport: boolean,
) {
  return motionAllowed && nearViewport;
}

type HomepagePlayableVideo = {
  play: () => Promise<void>;
  pause: () => void;
  addEventListener: (type: "canplay", listener: () => void) => void;
  removeEventListener: (type: "canplay", listener: () => void) => void;
};

export function keepHomepageVideoPlaying(
  video: HomepagePlayableVideo,
  shouldPlay: boolean,
) {
  if (!shouldPlay) {
    video.pause();
    return () => undefined;
  }

  let active = true;
  const attemptPlayback = () => {
    if (!active) return;
    void video.play().catch(() => undefined);
  };

  video.addEventListener("canplay", attemptPlayback);
  attemptPlayback();

  return () => {
    active = false;
    video.removeEventListener("canplay", attemptPlayback);
  };
}

export type HomepageVideoSource = {
  webmUrl?: string;
  mp4Url?: string;
};

export type HomepageMedia = {
  blackHole: HomepageVideoSource;
  sun: HomepageVideoSource;
  sky: HomepageVideoSource;
};
