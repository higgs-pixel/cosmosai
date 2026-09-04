import { safeExternalUrl } from "./safe-url.ts";
import { validateInternalRedirect } from "./redirect.ts";

type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };
const DISCOVERY_TYPES = ["apod", "nasa-image", "planet", "briefing"] as const;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

function hasOnlyKeys(record: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(record).every((key) => allowed.includes(key));
}

export function hasOnlyObjectKeys(value: unknown, allowed: readonly string[]) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && hasOnlyKeys(value as Record<string, unknown>, allowed));
}

export function validateChatMessageList(value: unknown, maxMessages: number, maxLength: number): ValidationResult<Array<{ role: "user" | "assistant"; content: string }>> {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxMessages) {
    return { ok: false, error: "Invalid message history." };
  }
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const item of value) {
    if (!hasOnlyObjectKeys(item, ["role", "content"])) return { ok: false, error: "Invalid chat message." };
    const message = item as Record<string, unknown>;
    if (message.role !== "user" && message.role !== "assistant") return { ok: false, error: "Invalid chat role." };
    if (typeof message.content !== "string" || !message.content.trim() || message.content.length > maxLength) {
      return { ok: false, error: "Chat message is too long or empty." };
    }
    messages.push({ role: message.role, content: message.content.trim() });
  }
  return { ok: true, data: messages };
}

function isSafeResourceUrl(value: unknown) {
  if (typeof value !== "string") return false;
  if (value.startsWith("/") && !value.startsWith("//")) {
    return validateInternalRedirect(value, "") !== "";
  }
  return Boolean(safeExternalUrl(value));
}

export function validateSavedDiscoveryInput(value: unknown): ValidationResult<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Invalid discovery." };
  const record = value as Record<string, unknown>;
  const allowed = ["id", "type", "title", "subtitle", "description", "imageUrl", "href", "source", "savedAt", "metadata"];
  if (!hasOnlyKeys(record, allowed)) return { ok: false, error: "Unexpected discovery field." };
  if (typeof record.id !== "string" || !ID_PATTERN.test(record.id.trim())) return { ok: false, error: "Invalid discovery ID." };
  if (!DISCOVERY_TYPES.includes(record.type as (typeof DISCOVERY_TYPES)[number])) return { ok: false, error: "Invalid discovery type." };
  if (typeof record.title !== "string" || !record.title.trim() || record.title.length > 240) return { ok: false, error: "Invalid title." };
  for (const [key, max] of [["subtitle", 240], ["description", 1_200], ["source", 120]] as const) {
    if (record[key] !== undefined && (typeof record[key] !== "string" || record[key].length > max)) return { ok: false, error: `Invalid ${key}.` };
  }
  for (const key of ["imageUrl", "href"] as const) {
    if (record[key] !== undefined && !isSafeResourceUrl(record[key])) return { ok: false, error: `Invalid ${key}.` };
  }
  if (record.metadata !== undefined) {
    if (!record.metadata || typeof record.metadata !== "object" || Array.isArray(record.metadata)) return { ok: false, error: "Invalid metadata." };
    if (JSON.stringify(record.metadata).length > 4_000) return { ok: false, error: "Metadata is too large." };
  }
  return { ok: true, data: record };
}

export type ValidWidgetLayout = { id: string; x: number; y: number; w: number; h: number };

export function validateWidgetLayoutInput(value: unknown): ValidationResult<ValidWidgetLayout[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Invalid layout payload." };
  const record = value as Record<string, unknown>;
  if (!hasOnlyKeys(record, ["layout"]) || !Array.isArray(record.layout) || record.layout.length > 16) {
    return { ok: false, error: "Invalid layout payload." };
  }
  const output: ValidWidgetLayout[] = [];
  for (const item of record.layout) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { ok: false, error: "Invalid widget." };
    const widget = item as Record<string, unknown>;
    if (!hasOnlyKeys(widget, ["id", "x", "y", "w", "h"])) return { ok: false, error: "Unexpected widget field." };
    if (typeof widget.id !== "string" || !ID_PATTERN.test(widget.id)) return { ok: false, error: "Invalid widget ID." };
    if (![widget.x, widget.y, widget.w, widget.h].every((part) => typeof part === "number" && Number.isFinite(part))) {
      return { ok: false, error: "Invalid widget dimensions." };
    }
    output.push({
      id: widget.id,
      x: Math.max(0, Math.min(11, Math.round(widget.x as number))),
      y: Math.max(0, Math.min(100, Math.round(widget.y as number))),
      w: Math.max(3, Math.min(12, Math.round(widget.w as number))),
      h: Math.max(2, Math.min(8, Math.round(widget.h as number))),
    });
  }
  return { ok: true, data: output };
}
