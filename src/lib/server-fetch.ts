import "server-only";
import { serverEnv } from "@/lib/config/env.server";

export type ServerFetchOptions = {
  accept?: string;
  headers?: HeadersInit;
  revalidate?: number;
  tags?: string[];
  timeoutMs?: number;
};

export class ServerFetchError extends Error {
  readonly endpoint: string;
  readonly status?: number;
  readonly statusText?: string;

  constructor(
    message: string,
    {
      endpoint,
      status,
      statusText,
    }: {
      endpoint: string;
      status?: number;
      statusText?: string;
    },
  ) {
    super(message);
    this.name = "ServerFetchError";
    this.endpoint = endpoint;
    this.status = status;
    this.statusText = statusText;
  }
}

export async function serverFetch(
  input: string | URL,
  options: ServerFetchOptions = {},
) {
  const endpoint = input.toString();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? serverEnv.serverFetchTimeoutMs,
  );

  try {
    const response = await fetch(input, {
      headers: {
        Accept: options.accept ?? "application/json",
        ...options.headers,
      },
      next: {
        revalidate: options.revalidate,
        tags: options.tags,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ServerFetchError("Server fetch returned an error response.", {
        endpoint,
        status: response.status,
        statusText: response.statusText,
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ServerFetchError) throw error;

    throw new ServerFetchError("Server fetch failed before receiving a response.", {
      endpoint,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function serverFetchJson<T>(
  input: string | URL,
  options: ServerFetchOptions = {},
): Promise<T> {
  const response = await serverFetch(input, options);
  return (await response.json()) as T;
}

export async function serverFetchText(
  input: string | URL,
  options: ServerFetchOptions = {},
) {
  const response = await serverFetch(input, {
    ...options,
    accept: options.accept ?? "application/rss+xml,text/xml,text/plain,*/*",
  });

  return response.text();
}
