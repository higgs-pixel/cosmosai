export type NasaErrorContext = {
  endpoint: string;
  status?: number;
  statusText?: string;
  rateLimit?: NasaRateLimit;
  details?: unknown;
};

export type NasaRateLimit = {
  limit?: number;
  remaining?: number;
  reset?: string;
};

export class NasaApiError extends Error {
  endpoint: string;
  status?: number;
  statusText?: string;
  rateLimit?: NasaRateLimit;
  details?: unknown;

  constructor(message: string, context: NasaErrorContext) {
    super(message);
    this.name = "NasaApiError";
    this.endpoint = context.endpoint;
    this.status = context.status;
    this.statusText = context.statusText;
    this.rateLimit = context.rateLimit;
    this.details = context.details;
  }
}

export function isNasaApiError(error: unknown): error is NasaApiError {
  return error instanceof NasaApiError;
}
