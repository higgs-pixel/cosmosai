export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "DATABASE_ERROR"
  | "CONFIGURATION_ERROR"
  | "INTERNAL_ERROR";

export const APP_ERROR_HTTP_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 403,
  RATE_LIMITED: 429,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PROVIDER_TIMEOUT: 504,
  PROVIDER_UNAVAILABLE: 503,
  DATABASE_ERROR: 500,
  CONFIGURATION_ERROR: 500,
  INTERNAL_ERROR: 500,
} as const satisfies Record<AppErrorCode, number>;

export const APP_ERROR_PUBLIC_MESSAGE = {
  VALIDATION_ERROR: "The request contains invalid data.",
  UNAUTHENTICATED: "Please sign in to continue.",
  UNAUTHORIZED: "You do not have permission to perform this action.",
  RATE_LIMITED: "Too many requests. Please try again shortly.",
  NOT_FOUND: "The requested resource was not found.",
  CONFLICT: "The request conflicts with the current resource state.",
  PROVIDER_TIMEOUT: "A data source took too long to respond. Please try again.",
  PROVIDER_UNAVAILABLE: "A required data source is temporarily unavailable.",
  DATABASE_ERROR: "The request could not be completed.",
  CONFIGURATION_ERROR: "The service is temporarily unavailable.",
  INTERNAL_ERROR: "The request could not be completed.",
} as const satisfies Record<AppErrorCode, string>;

export const APP_ERROR_RETRYABLE = {
  VALIDATION_ERROR: false,
  UNAUTHENTICATED: false,
  UNAUTHORIZED: false,
  RATE_LIMITED: true,
  NOT_FOUND: false,
  CONFLICT: false,
  PROVIDER_TIMEOUT: true,
  PROVIDER_UNAVAILABLE: true,
  DATABASE_ERROR: true,
  CONFIGURATION_ERROR: false,
  INTERNAL_ERROR: false,
} as const satisfies Record<AppErrorCode, boolean>;
