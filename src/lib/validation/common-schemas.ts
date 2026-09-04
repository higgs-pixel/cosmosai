import { z } from "zod";
import { VALIDATION_LIMITS } from "./limits.ts";

export function trimmedTextSchema({
  min = 1,
  max = VALIDATION_LIMITS.text.defaultMax,
}: {
  min?: number;
  max?: number;
} = {}) {
  return z.string().trim().min(min).max(max);
}

export const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(VALIDATION_LIMITS.id.maxLength)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

function isPrivateNetworkHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "::1" ||
    /^(?:fc|fd)[0-9a-f]{2}:/i.test(host) ||
    /^fe[89ab][0-9a-f]:/i.test(host)
  ) {
    return true;
  }

  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet > 255)) return true;
  return (
    octets[0] === 0 ||
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    octets[0] >= 224
  );
}

export const safeHttpUrlSchema = z
  .string()
  .trim()
  .max(VALIDATION_LIMITS.url.maxLength)
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        (url.protocol === "http:" || url.protocol === "https:") &&
        !url.username &&
        !url.password &&
        !isPrivateNetworkHost(url.hostname)
      );
    } catch {
      return false;
    }
  });

export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(VALIDATION_LIMITS.pagination.defaultPage)
    .max(VALIDATION_LIMITS.pagination.maxPage)
    .default(VALIDATION_LIMITS.pagination.defaultPage),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(VALIDATION_LIMITS.pagination.maxPageSize)
    .default(VALIDATION_LIMITS.pagination.defaultPageSize),
}).strict();
