import { SecurityHttpError } from "./auth.ts";

export type PublicError = {
  error: string;
  code: string;
  requestId: string;
};

export function getPublicError(error: unknown, requestId: string): PublicError {
  if (error instanceof SecurityHttpError) {
    return { error: error.publicMessage, code: error.code, requestId };
  }

  return {
    error: "The request could not be completed safely.",
    code: "REQUEST_FAILED",
    requestId,
  };
}

export function statusForError(error: unknown) {
  return error instanceof SecurityHttpError ? error.status : 500;
}

