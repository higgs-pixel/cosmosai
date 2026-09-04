import { SecurityHttpError } from "./auth.ts";

export function getTrustedSiteOrigin(developmentFallback?: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) {
    try {
      const url = new URL(configured);
      const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (url.protocol === "https:" || (isLocal && url.protocol === "http:")) {
        return url.origin;
      }
    } catch {
      // Fall through to the safe failure below.
    }
  }

  if (process.env.NODE_ENV !== "production" && developmentFallback) {
    const fallback = new URL(developmentFallback);
    if (fallback.hostname === "localhost" || fallback.hostname === "127.0.0.1") return fallback.origin;
  }

  throw new SecurityHttpError(500, "Authentication is temporarily unavailable.", "SITE_ORIGIN_INVALID");
}
