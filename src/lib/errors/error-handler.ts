/**
 * Centralized error handling utilities.
 * Use these for consistent error processing across the application.
 */

import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

import { ActionResult } from "@/types/action-result";
import { AppError, ValidationError, DatabaseError, NotFoundError } from "./app-error";
import { ErrorCode } from "./error-codes";

/**
 * Extended ActionResult with error code for typed error handling.
 */
export type ActionResultWithCode<T = void> = ActionResult<T> & {
  code?: ErrorCode;
};

/**
 * Convert an error to ActionResult format.
 * Handles AppError, ZodError, Prisma errors, and generic errors.
 */
export function toActionResult<T = void>(error: unknown): ActionResultWithCode<T> {
  // Handle our custom AppError
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = ValidationError.fromZodError(error);
    return {
      success: false,
      error: validationError.message,
      code: ErrorCode.VALIDATION_ERROR,
    };
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      success: false,
      error: "Invalid data provided",
      code: ErrorCode.VALIDATION_ERROR,
    };
  }

  // Handle generic Error
  if (error instanceof Error) {
    // Don't expose internal error details in production
    const message =
      process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred";

    return {
      success: false,
      error: message,
      code: ErrorCode.INTERNAL_ERROR,
    };
  }

  // Unknown error type
  return {
    success: false,
    error: "An unexpected error occurred",
    code: ErrorCode.INTERNAL_ERROR,
  };
}

/**
 * Handle Prisma-specific errors and convert to ActionResult.
 */
function handlePrismaError<T>(
  error: Prisma.PrismaClientKnownRequestError
): ActionResultWithCode<T> {
  switch (error.code) {
    // Unique constraint violation
    case "P2002": {
      const target = (error.meta?.target as string[])?.join(", ") ?? "field";
      return {
        success: false,
        error: `A record with this ${target} already exists`,
        code: ErrorCode.ALREADY_EXISTS,
      };
    }

    // Foreign key constraint violation
    case "P2003": {
      return {
        success: false,
        error: "Referenced record does not exist",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // Record not found (update/delete)
    case "P2025": {
      return {
        success: false,
        error: "Record not found",
        code: ErrorCode.NOT_FOUND,
      };
    }

    // Required relation violation
    case "P2014": {
      return {
        success: false,
        error: "Required relation is missing",
        code: ErrorCode.VALIDATION_ERROR,
      };
    }

    // Default database error
    default: {
      console.error(`Prisma error [${error.code}]:`, error.message);
      return {
        success: false,
        error: "Database operation failed",
        code: ErrorCode.DATABASE_ERROR,
      };
    }
  }
}

/**
 * Log error with context for debugging.
 * In production, this could send to Sentry or other error tracking.
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? JSON.stringify(context) : "";

  if (error instanceof AppError) {
    console.error(
      `[${timestamp}] AppError [${error.code}]: ${error.message}`,
      error.details,
      contextStr
    );
  } else if (error instanceof Error) {
    console.error(`[${timestamp}] Error: ${error.message}`, error.stack, contextStr);
  } else {
    console.error(`[${timestamp}] Unknown error:`, error, contextStr);
  }

  // TODO: Send to Sentry in production
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, { extra: context });
  // }
}

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is a specific error code.
 */
export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return error instanceof AppError && error.code === code;
}

/**
 * Wrap an async function with error handling.
 * Returns ActionResult instead of throwing.
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<ActionResultWithCode<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    logError(error, { context });
    return toActionResult<T>(error);
  }
}

/**
 * Assert that a value exists, throw NotFoundError if not.
 */
export function assertExists<T>(
  value: T | null | undefined,
  resource: string,
  identifier?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resource, identifier);
  }
}

/**
 * Create a user-friendly error message from an error code.
 */
export function getErrorMessage(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.UNAUTHORIZED]: "Please log in to continue",
    [ErrorCode.INVALID_CREDENTIALS]: "Invalid email or password",
    [ErrorCode.SESSION_EXPIRED]: "Your session has expired. Please log in again.",
    [ErrorCode.TWO_FACTOR_REQUIRED]: "Please enter your two-factor authentication code",
    [ErrorCode.INVALID_TWO_FACTOR_CODE]: "Invalid authentication code",
    [ErrorCode.FORBIDDEN]: "You don't have permission to do this",
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: "You don't have the required permissions",
    [ErrorCode.ROLE_REQUIRED]: "This action requires a specific role",
    [ErrorCode.VALIDATION_ERROR]: "Please check your input and try again",
    [ErrorCode.INVALID_INPUT]: "The provided input is invalid",
    [ErrorCode.MISSING_REQUIRED_FIELD]: "Please fill in all required fields",
    [ErrorCode.INVALID_FORMAT]: "The format is invalid",
    [ErrorCode.NOT_FOUND]: "The requested item was not found",
    [ErrorCode.ALREADY_EXISTS]: "This item already exists",
    [ErrorCode.CONFLICT]: "There was a conflict with the current state",
    [ErrorCode.GONE]: "This item is no longer available",
    [ErrorCode.RATE_LIMITED]: "Too many requests. Please wait a moment.",
    [ErrorCode.TOO_MANY_REQUESTS]: "Too many requests. Please try again later.",
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: "An external service is unavailable",
    [ErrorCode.PAYMENT_FAILED]: "Payment processing failed",
    [ErrorCode.EMAIL_SEND_FAILED]: "Failed to send email",
    [ErrorCode.STORAGE_ERROR]: "File storage operation failed",
    [ErrorCode.DATABASE_ERROR]: "A database error occurred",
    [ErrorCode.TRANSACTION_FAILED]: "The operation could not be completed",
    [ErrorCode.INTERNAL_ERROR]: "An unexpected error occurred",
    [ErrorCode.NOT_IMPLEMENTED]: "This feature is not yet available",
    [ErrorCode.SERVICE_UNAVAILABLE]: "Service temporarily unavailable",
  };

  return messages[code] ?? "An error occurred";
}
