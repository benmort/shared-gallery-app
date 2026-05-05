export type UploadErrorCode =
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "NOT_FOUND"
  | "STORAGE_ERROR"
  | "PROCESSING_ERROR"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "UNAUTHORIZED"
  | "UNKNOWN";

export class UploadError extends Error {
  readonly code: UploadErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(input: {
    code: UploadErrorCode;
    message: string;
    status?: number;
    retryable?: boolean;
    details?: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = "UploadError";
    this.code = input.code;
    this.status = input.status ?? 500;
    this.retryable = input.retryable ?? false;
    this.details = input.details;
  }
}

export function toUploadError(error: unknown): UploadError {
  if (error instanceof UploadError) return error;
  if (error instanceof Error) {
    return new UploadError({
      code: "UNKNOWN",
      message: error.message || "Unexpected upload failure",
      status: 500,
      retryable: false,
    });
  }
  return new UploadError({
    code: "UNKNOWN",
    message: "Unexpected upload failure",
    status: 500,
    retryable: false,
  });
}

export function uploadErrorResponse(error: unknown): {
  status: number;
  body: {
    error: string;
    code: UploadErrorCode;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
} {
  const e = toUploadError(error);
  return {
    status: e.status,
    body: {
      error: e.message,
      code: e.code,
      retryable: e.retryable,
      details: e.details,
    },
  };
}
