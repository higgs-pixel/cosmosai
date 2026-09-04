const PRIVATE_IPV4 = [
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  if (normalized.endsWith(".localhost") || normalized.endsWith(".local") || normalized.endsWith(".internal")) return true;
  if (PRIVATE_IPV4.some((pattern) => pattern.test(normalized))) return true;
  return normalized === "169.254.169.254" || normalized === "metadata.google.internal";
}

export function safeExternalUrl(value: unknown, options: { allowMailto?: boolean } = {}) {
  if (typeof value !== "string" || value.length > 2_048) return null;

  try {
    const url = new URL(value);
    const protocols = options.allowMailto ? ["http:", "https:", "mailto:"] : ["http:", "https:"];
    if (!protocols.includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (url.protocol !== "mailto:" && isPrivateHostname(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

