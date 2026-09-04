import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "bad_request"
  | "missing_environment_variable"
  | "not_found"
  | "service_unavailable"
  | "unexpected_error";

export function jsonOk<T>(
  data: T,
  init: ResponseInit & { revalidate?: number } = {},
) {
  const headers = new Headers(init.headers);
  if (init.revalidate !== undefined) {
    headers.set("Cache-Control", `s-maxage=${init.revalidate}, stale-while-revalidate=${init.revalidate * 2}`);
  }

  return NextResponse.json(
    {
      success: true,
      data,
    },
    {
      ...init,
      headers,
    },
  );
}

export function jsonError(
  message: string,
  {
    code = "unexpected_error",
    status = 500,
    details,
  }: {
    code?: ApiErrorCode;
    status?: number;
    details?: unknown;
  } = {},
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

export function jsonErrorFromUnknown(error: unknown) {
  void error;
  return jsonError("The requested service is temporarily unavailable.", {
    code: "service_unavailable",
    status: 503,
  });
}
