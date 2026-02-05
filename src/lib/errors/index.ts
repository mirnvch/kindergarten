/**
 * Error handling module.
 *
 * @example
 * // Throwing errors
 * import { NotFoundError, ValidationError } from "@/lib/errors";
 * throw new NotFoundError("User", userId);
 * throw ValidationError.fromZodError(zodError);
 *
 * @example
 * // Handling errors in Server Actions
 * import { toActionResult, withErrorHandling } from "@/lib/errors";
 * return withErrorHandling(() => userService.update(id, data), "updateUser");
 *
 * @example
 * // Type guards
 * import { isAppError, hasErrorCode, ErrorCode } from "@/lib/errors";
 * if (hasErrorCode(error, ErrorCode.NOT_FOUND)) {
 *   // Handle not found
 * }
 */

// Error codes enum
export { ErrorCode, ErrorStatusCodes } from "./error-codes";

// Error classes
export {
  // Base
  AppError,
  // Authentication
  UnauthorizedError,
  InvalidCredentialsError,
  SessionExpiredError,
  TwoFactorRequiredError,
  // Authorization
  ForbiddenError,
  InsufficientPermissionsError,
  RoleRequiredError,
  // Validation
  ValidationError,
  InvalidInputError,
  MissingFieldError,
  // Resources
  NotFoundError,
  AlreadyExistsError,
  ConflictError,
  // Rate limiting
  RateLimitError,
  // External services
  ExternalServiceError,
  PaymentError,
  EmailError,
  StorageError,
  // Database
  DatabaseError,
  TransactionError,
  // Generic
  InternalError,
  NotImplementedError,
  ServiceUnavailableError,
} from "./app-error";

// Error handling utilities
export {
  type ActionResultWithCode,
  toActionResult,
  logError,
  isAppError,
  hasErrorCode,
  withErrorHandling,
  assertExists,
  getErrorMessage,
} from "./error-handler";
