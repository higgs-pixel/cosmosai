import { SecurityHttpError } from "./auth.ts";

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new SecurityHttpError(413, "Request body is too large.", "PAYLOAD_TOO_LARGE");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new SecurityHttpError(413, "Request body is too large.", "PAYLOAD_TOO_LARGE");
  }

  try {
    const value = JSON.parse(text) as unknown;
    assertJsonComplexity(value);
    return value;
  } catch {
    throw new SecurityHttpError(400, "Request body must be valid JSON.", "INVALID_JSON");
  }
}

function assertJsonComplexity(value: unknown) {
  const queue: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  let nodes = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    nodes += 1;
    if (nodes > 2_000 || current.depth > 20) throw new Error("JSON is too complex.");
    if (!current.value || typeof current.value !== "object") continue;
    const children = Array.isArray(current.value)
      ? current.value
      : Object.values(current.value as Record<string, unknown>);
    for (const child of children) queue.push({ value: child, depth: current.depth + 1 });
  }
}
