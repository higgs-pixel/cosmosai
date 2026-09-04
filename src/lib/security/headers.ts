const NASA_IMAGE_SOURCES = [
  "https://images-assets.nasa.gov",
  "https://www.nasa.gov",
  "https://apod.nasa.gov",
  "https://mars.nasa.gov",
  "https://photojournal.jpl.nasa.gov",
].join(" ");

export function getContentSecurityPolicy(production: boolean) {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${NASA_IMAGE_SOURCES} https://*.supabase.co https://*.arcgisonline.com https://server.arcgisonline.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com`,
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com https://va.vercel-scripts.com",
    "media-src 'self' blob: https://images-assets.nasa.gov https://mars.nasa.gov https://*.public.blob.vercel-storage.com",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  if (production) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function getNasaImageSecurityHeaders(production: boolean) {
  return [{ key: "Content-Security-Policy", value: getContentSecurityPolicy(production) }];
}

export function getSecurityHeaders(production: boolean) {
  const headers = [
    { key: "Content-Security-Policy", value: getContentSecurityPolicy(production) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  ];
  if (production) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }
  return headers;
}
