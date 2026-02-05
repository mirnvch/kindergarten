/**
 * Centralized error codes for the application.
 * Use these codes for consistent error identification and handling.
 */

export enum ErrorCode {
  // Authentication errors (1xx)
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  TWO_FACTOR_REQUIRED = "TWO_FACTOR_REQUIRED",
  INVALID_TWO_FACTOR_CODE = "INVALID_TWO_FACTOR_CODE",

  // Authorization errors (2xx)
  FORBIDDEN = "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  ROLE_REQUIRED = "ROLE_REQUIRED",

  // Validation errors (3xx)
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT = "INVALID_FORMAT",

  // Resource errors (4xx)
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  CONFLICT = "CONFLICT",
  GONE = "GONE",

  // Rate limiting errors (5xx)
  RATE_LIMITED = "RATE_LIMITED",
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",

  // External service errors (6xx)
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  EMAIL_SEND_FAILED = "EMAIL_SEND_FAILED",
  STORAGE_ERROR = "STORAGE_ERROR",

  // Database errors (7xx)
  DATABASE_ERROR = "DATABASE_ERROR",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",

  // Generic errors (9xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

/**
 * HTTP status codes mapping for error codes.
 */
export const ErrorStatusCodes: Record<ErrorCode, number> = {
  // Authentication (401)
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,
  [ErrorCode.TWO_FACTOR_REQUIRED]: 401,
  [ErrorCode.INVALID_TWO_FACTOR_CODE]: 401,

  // Authorization (403)
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.ROLE_REQUIRED]: 403,

  // Validation (400)
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,

  // Resource (404, 409, 410)
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.GONE]: 410,

  // Rate limiting (429)
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,

  // External service (502)
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.PAYMENT_FAILED]: 502,
  [ErrorCode.EMAIL_SEND_FAILED]: 502,
  [ErrorCode.STORAGE_ERROR]: 502,

  // Database (500)
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.TRANSACTION_FAILED]: 500,

  // Generic (500, 501, 503)
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.NOT_IMPLEMENTED]: 501,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
};
