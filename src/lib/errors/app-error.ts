import {
  APP_ERROR_HTTP_STATUS,
  APP_ERROR_PUBLIC_MESSAGE,
  APP_ERROR_RETRYABLE,
  type AppErrorCode,
} from "./error-codes.ts";

export type AppErrorMetadata = Readonly<Record<string, unknown>>;

export type AppErrorOptions = {
  code: AppErrorCode;
  publicMessage?: string;
  internalMessage?: string;
  httpStatus?: number;
  cause?: unknown;
  metadata?: AppErrorMetadata;
  retryable?: boolean;
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly publicMessage: string;
  readonly internalMessage: string;
  readonly httpStatus: number;
  readonly cause?: unknown;
  readonly metadata?: AppErrorMetadata;
  readonly retryable: boolean;

  constructor(options: AppErrorOptions) {
    const internalMessage =
      options.internalMessage ?? APP_ERROR_PUBLIC_MESSAGE[options.code];
    super(internalMessage);
    this.name = "AppError";
    this.code = options.code;
    this.publicMessage =
      options.publicMessage ?? APP_ERROR_PUBLIC_MESSAGE[options.code];
    this.internalMessage = internalMessage;
    this.httpStatus = options.httpStatus ?? APP_ERROR_HTTP_STATUS[options.code];
    this.cause = options.cause;
    this.metadata = options.metadata;
    this.retryable = options.retryable ?? APP_ERROR_RETRYABLE[options.code];
  }
}
