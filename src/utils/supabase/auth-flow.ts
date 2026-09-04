export const AUTH_CODE_VERIFIER_COOKIE = "cosmos-sb-code-verifier";
export const AUTH_FLOW_COOKIE_MAX_AGE = 60 * 10;

const PKCE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
const BASE64_URL_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function encodeBase64Url(bytes: Uint8Array) {
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const value = (first << 16) | (second << 8) | third;

    output += BASE64_URL_CHARACTERS[(value >>> 18) & 63];
    output += BASE64_URL_CHARACTERS[(value >>> 12) & 63];
    if (index + 1 < bytes.length) output += BASE64_URL_CHARACTERS[(value >>> 6) & 63];
    if (index + 2 < bytes.length) output += BASE64_URL_CHARACTERS[value & 63];
  }

  return output;
}

export function createPkceVerifier() {
  const random = new Uint8Array(64);
  crypto.getRandomValues(random);
  return Array.from(random, (value) => PKCE_CHARACTERS[value % PKCE_CHARACTERS.length]).join("");
}

export async function createPkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return encodeBase64Url(new Uint8Array(digest));
}

export function validateInternalAuthRedirect(value: string | null | undefined, fallback = "/account") {
  return validateInternalRedirect(value, fallback);
}
import { validateInternalRedirect } from "@/lib/security/redirect";
