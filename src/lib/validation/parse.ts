import { z } from "zod";
import { AppError } from "../errors/app-error.ts";
import { VALIDATION_LIMITS } from "./limits.ts";

type ParseOptions = {
  publicMessage?: string;
  internalContext?: string;
};

type ParseJsonOptions = ParseOptions & {
  maxBytes?: number;
};

function validationError(error: z.ZodError, options: ParseOptions) {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join(".") || "request",
    code: issue.code,
  }));

  return new AppError({
    code: "VALIDATION_ERROR",
    publicMessage: options.publicMessage,
    internalMessage: `${options.internalContext ?? "Request validation failed"}: ${issues
      .map(({ path, code }) => `${path}:${code}`)
      .join(", ")}`,
    metadata: { issues },
  });
}

export function parseInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
  options: ParseOptions = {},
): T {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error, options);
  return result.data;
}

export function safeParseInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
  options: ParseOptions = {},
): { success: true; data: T } | { success: false; error: AppError } {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { success: false, error: validationError(result.error, options) };
  }
  return { success: true, data: result.data };
}

export async function parseJsonRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
  options: ParseJsonOptions = {},
): Promise<T> {
  const body = await request.text();
  const maxBytes = options.maxBytes ?? VALIDATION_LIMITS.json.maxBytes;
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      publicMessage: options.publicMessage,
      internalMessage: `${options.internalContext ?? "Request validation failed"}: body exceeds ${maxBytes} bytes`,
    });
  }

  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    throw new AppError({
      code: "VALIDATION_ERROR",
      publicMessage: options.publicMessage,
      internalMessage: `${options.internalContext ?? "Request validation failed"}: malformed JSON body`,
    });
  }

  return parseInput(schema, input, options);
}
