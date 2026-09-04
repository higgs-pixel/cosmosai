import { NextResponse } from "next/server";
import { SecurityHttpError } from "./auth";
import { getPublicError, statusForError } from "./errors";
import { createSecurityRequestId, logSecurityEvent } from "./logger";
import { isSameOriginMutation } from "./origin";

export function getRequestId(request: Request) {
  const supplied = request.headers.get("x-request-id");
  return supplied && /^[A-Za-z0-9._-]{1,100}$/.test(supplied) ? supplied : createSecurityRequestId();
}

export function requireSameOrigin(request: Request, endpoint: string, requestId: string) {
  if (isSameOriginMutation(request)) return;
  logSecurityEvent("cross_origin_mutation_rejected", { endpoint, requestId, reason: "origin_mismatch" });
  throw new SecurityHttpError(403, "This request was not accepted.", "ORIGIN_REJECTED");
}

export function securityErrorResponse(error: unknown, requestId: string) {
  return NextResponse.json(getPublicError(error, requestId), {
    status: statusForError(error),
    headers: { "Cache-Control": "no-store", "x-cosmos-request-id": requestId },
  });
}

