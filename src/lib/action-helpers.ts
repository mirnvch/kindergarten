/**
 * Helper functions for creating consistent ActionResult responses.
 * Use these in server actions instead of manually constructing result objects.
 */

import { ActionResult } from "@/types/action-result";

/**
 * Create a success result with optional data.
 * @example
 * return successResult({ user: createdUser });
 * return successResult(); // for void actions
 */
export function successResult<T = void>(data?: T): ActionResult<T> {
  if (data === undefined) {
    return { success: true } as ActionResult<T>;
  }
  return { success: true, data };
}

/**
 * Create an error result with a message.
 * @example
 * return errorResult("User not found");
 * return errorResult("Validation failed", validationErrors);
 */
export function errorResult(error: string): ActionResult<never> {
  return { success: false, error };
}

/**
 * Handle errors in server actions consistently.
 * Logs the error and returns a user-friendly message.
 * @example
 * try {
 *   // ... action logic
 * } catch (error) {
 *   return handleActionError(error, "Failed to create booking");
 * }
 */
export function handleActionError(
  error: unknown,
  fallbackMessage: string,
  context?: string
): ActionResult<never> {
  // Log the actual error for debugging
  const prefix = context ? `[${context}]` : "[Action]";
  console.error(`${prefix} Error:`, error);

  // Return user-friendly message
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    return errorResult(`${fallbackMessage}: ${error.message}`);
  }

  return errorResult(fallbackMessage);
}

/**
 * Type guard to check if a result is successful.
 * Useful for type narrowing in calling code.
 * @example
 * const result = await createUser(data);
 * if (isSuccess(result)) {
 *   console.log(result.data.id); // TypeScript knows data exists
 * }
 */
export function isSuccess<T>(
  result: ActionResult<T>
): result is ActionResult<T> & { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if a result is an error.
 * @example
 * if (isError(result)) {
 *   toast.error(result.error);
 * }
 */
export function isError<T>(
  result: ActionResult<T>
): result is ActionResult<T> & { success: false; error: string } {
  return result.success === false;
}

/**
 * Common error messages for reuse.
 */
export const ActionErrors = {
  NOT_AUTHENTICATED: "Not authenticated",
  NOT_AUTHORIZED: "Not authorized",
  NOT_FOUND: "Resource not found",
  INVALID_INPUT: "Invalid input",
  RATE_LIMITED: "Too many requests. Please try again later.",
  INTERNAL_ERROR: "An unexpected error occurred",
} as const;
