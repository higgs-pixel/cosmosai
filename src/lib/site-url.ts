const LOCAL_SITE_URL = "http://localhost:3000";

function withProtocol(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function getSiteUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    LOCAL_SITE_URL;
  const normalizedUrl = rawUrl.trim() || LOCAL_SITE_URL;

  return withProtocol(normalizedUrl).replace(/\/$/, "");
}
