/**
 * Base error classes for the application.
 * Extend these for domain-specific errors.
 */

import { ErrorCode, ErrorStatusCodes } from "./error-codes";

/**
 * Base application error class.
 * All custom errors should extend this class.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    statusCode?: number
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode ?? ErrorStatusCodes[code];
    this.details = details;
    this.isOperational = true; // Operational errors are expected (vs programming errors)

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to a plain object for serialization.
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Errors
// ─────────────────────────────────────────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(ErrorCode.UNAUTHORIZED, message);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = "Invalid email or password") {
    super(ErrorCode.INVALID_CREDENTIALS, message);
  }
}

export class SessionExpiredError extends AppError {
  constructor(message = "Session expired. Please log in again.") {
    super(ErrorCode.SESSION_EXPIRED, message);
  }
}

export class TwoFactorRequiredError extends AppError {
  constructor(message = "Two-factor authentication required") {
    super(ErrorCode.TWO_FACTOR_REQUIRED, message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Authorization Errors
// ─────────────────────────────────────────────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(ErrorCode.FORBIDDEN, message);
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(requiredPermission?: string) {
    const message = requiredPermission
      ? `Missing required permission: ${requiredPermission}`
      : "Insufficient permissions";
    super(ErrorCode.INSUFFICIENT_PERMISSIONS, message, { requiredPermission });
  }
}

export class RoleRequiredError extends AppError {
  constructor(requiredRole: string) {
    super(ErrorCode.ROLE_REQUIRED, `This action requires ${requiredRole} role`, {
      requiredRole,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Errors
// ─────────────────────────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    fieldErrors?: Record<string, string[]>,
    details?: Record<string, unknown>
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, { ...details, fieldErrors });
    this.fieldErrors = fieldErrors;
  }

  /**
   * Create a validation error from Zod errors.
   */
  static fromZodError(zodError: {
    issues: Array<{ path: PropertyKey[]; message: string }>;
  }): ValidationError {
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of zodError.issues) {
      const path = issue.path.map(String).join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }

    const firstError = zodError.issues[0]?.message ?? "Validation failed";
    return new ValidationError(firstError, fieldErrors);
  }
}

export class InvalidInputError extends AppError {
  constructor(message = "Invalid input provided", field?: string) {
    super(ErrorCode.INVALID_INPUT, message, { field });
  }
}

export class MissingFieldError extends AppError {
  constructor(fieldName: string) {
    super(ErrorCode.MISSING_REQUIRED_FIELD, `Missing required field: ${fieldName}`, {
      field: fieldName,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource Errors
// ─────────────────────────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with id "${identifier}" not found`
      : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, { resource, identifier });
  }
}

export class AlreadyExistsError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with id "${identifier}" already exists`
      : `${resource} already exists`;
    super(ErrorCode.ALREADY_EXISTS, message, { resource, identifier });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.CONFLICT, message, details);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting Errors
// ─────────────────────────────────────────────────────────────────────────────

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(retryAfterSeconds?: number) {
    const message = retryAfterSeconds
      ? `Too many requests. Please try again in ${retryAfterSeconds} seconds.`
      : "Too many requests. Please try again later.";
    super(ErrorCode.RATE_LIMITED, message, { retryAfter: retryAfterSeconds });
    this.retryAfter = retryAfterSeconds;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// External Service Errors
// ─────────────────────────────────────────────────────────────────────────────

export class ExternalServiceError extends AppError {
  constructor(serviceName: string, originalError?: string) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, `External service error: ${serviceName}`, {
      serviceName,
      originalError,
    });
  }
}

export class PaymentError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.PAYMENT_FAILED, message, details);
  }
}

export class EmailError extends AppError {
  constructor(message = "Failed to send email", details?: Record<string, unknown>) {
    super(ErrorCode.EMAIL_SEND_FAILED, message, details);
  }
}

export class StorageError extends AppError {
  constructor(message = "Storage operation failed", details?: Record<string, unknown>) {
    super(ErrorCode.STORAGE_ERROR, message, details);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Errors
// ─────────────────────────────────────────────────────────────────────────────

export class DatabaseError extends AppError {
  constructor(message = "Database operation failed", details?: Record<string, unknown>) {
    super(ErrorCode.DATABASE_ERROR, message, details);
  }
}

export class TransactionError extends AppError {
  constructor(message = "Transaction failed", details?: Record<string, unknown>) {
    super(ErrorCode.TRANSACTION_FAILED, message, details);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Errors
// ─────────────────────────────────────────────────────────────────────────────

export class InternalError extends AppError {
  constructor(message = "An unexpected error occurred") {
    super(ErrorCode.INTERNAL_ERROR, message);
  }
}

export class NotImplementedError extends AppError {
  constructor(feature: string) {
    super(ErrorCode.NOT_IMPLEMENTED, `${feature} is not implemented yet`, { feature });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service temporarily unavailable") {
    super(ErrorCode.SERVICE_UNAVAILABLE, message);
  }
}
