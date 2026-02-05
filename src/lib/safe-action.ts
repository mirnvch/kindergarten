/**
 * createSafeAction — wrapper for Server Actions with automatic:
 * - Authentication check
 * - Zod validation
 * - Error handling with typed errors
 * - Rate limiting (optional)
 *
 * @example
 * // Basic usage
 * export const updateProfile = createSafeAction(
 *   updateProfileSchema,
 *   async (data, ctx) => {
 *     return db.user.update({ where: { id: ctx.userId }, data });
 *   }
 * );
 *
 * @example
 * // With rate limiting
 * export const submitReview = createSafeAction(
 *   reviewSchema,
 *   async (data, ctx) => { ... },
 *   { rateLimit: "review" }
 * );
 *
 * @example
 * // Public action (no auth required)
 * export const searchProviders = createSafeAction(
 *   searchSchema,
 *   async (data) => { ... },
 *   { requireAuth: false }
 * );
 */

import { z } from "zod";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { rateLimit, type RateLimitType } from "@/lib/rate-limit";
import { ActionResult } from "@/types/action-result";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  RateLimitError,
  toActionResult,
  logError,
  ErrorCode,
} from "@/lib/errors";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context passed to action handlers.
 */
export interface ActionContext {
  /** Authenticated user ID (empty string if requireAuth is false and user not logged in) */
  userId: string;
  /** User's role */
  role: string;
  /** User's email */
  email: string;
  /** Client IP address */
  ip: string;
}

/**
 * Options for createSafeAction.
 */
export interface SafeActionOptions {
  /** Require authentication (default: true) */
  requireAuth?: boolean;
  /** Rate limit type to apply */
  rateLimit?: RateLimitType;
  /** Custom rate limit identifier (default: userId or IP) */
  rateLimitKey?: (ctx: ActionContext) => string;
}

/**
 * Extended ActionResult with error code.
 */
export type SafeActionResult<T> = ActionResult<T> & {
  code?: ErrorCode;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get client IP from headers.
 */
async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Check rate limit and throw if exceeded.
 */
async function checkRateLimit(type: RateLimitType, identifier: string): Promise<void> {
  const result = await rateLimit(identifier, type);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    throw new RateLimitError(retryAfter);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createSafeAction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a type-safe server action.
 *
 * By default requires authentication. Set `requireAuth: false` for public actions.
 * The handler receives validated data and context with user info (if authenticated).
 */
export function createSafeAction<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput, ctx: ActionContext) => Promise<TOutput>,
  options?: SafeActionOptions
): (input: TInput) => Promise<SafeActionResult<TOutput>> {
  const { requireAuth = true, rateLimit: rateLimitType, rateLimitKey } = options ?? {};

  return async (input: TInput): Promise<SafeActionResult<TOutput>> => {
    try {
      const ip = await getClientIp();

      // ─── Authentication ───────────────────────────────────────────────
      const session = await auth();

      if (requireAuth && !session?.user?.id) {
        throw new UnauthorizedError();
      }

      const ctx: ActionContext = {
        userId: session?.user?.id ?? "",
        role: session?.user?.role ?? "PATIENT",
        email: session?.user?.email ?? "",
        ip,
      };

      // ─── Rate Limiting ────────────────────────────────────────────────
      if (rateLimitType) {
        const identifier = rateLimitKey ? rateLimitKey(ctx) : ctx.userId || ip;

        await checkRateLimit(rateLimitType, identifier);
      }

      // ─── Validation ───────────────────────────────────────────────────
      const parseResult = schema.safeParse(input);

      if (!parseResult.success) {
        throw ValidationError.fromZodError(parseResult.error);
      }

      // ─── Execute Handler ──────────────────────────────────────────────
      const data = await handler(parseResult.data, ctx);

      return { success: true, data };
    } catch (error) {
      // Log error for debugging
      logError(error, {
        action: handler.name || "anonymous",
        input: process.env.NODE_ENV === "development" ? input : undefined,
      });

      // Convert to ActionResult
      return toActionResult<TOutput>(error);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// createFormAction — for FormData inputs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a type-safe server action that accepts FormData.
 * Useful for file uploads and traditional form submissions.
 *
 * @example
 * export const uploadAvatar = createFormAction(
 *   z.object({
 *     file: z.instanceof(File),
 *     description: z.string().optional(),
 *   }),
 *   async (data, ctx) => {
 *     // data.file is a File
 *     // data.description is string | undefined
 *   }
 * );
 */
export function createFormAction<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (data: TInput, ctx: ActionContext) => Promise<TOutput>,
  options: SafeActionOptions = {}
): (formData: FormData) => Promise<SafeActionResult<TOutput>> {
  const action = createSafeAction(schema, handler, options);

  return async (formData: FormData): Promise<SafeActionResult<TOutput>> => {
    // Convert FormData to object
    const obj: Record<string, unknown> = {};

    formData.forEach((value, key) => {
      // Handle multiple values with same key
      if (obj[key] !== undefined) {
        if (Array.isArray(obj[key])) {
          (obj[key] as unknown[]).push(value);
        } else {
          obj[key] = [obj[key], value];
        }
      } else {
        obj[key] = value;
      }
    });

    return action(obj as TInput);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: action composer for complex scenarios
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compose multiple checks before running an action.
 * Useful for complex authorization scenarios.
 *
 * @example
 * const updateProviderProfile = composeAction(
 *   requireRole("PROVIDER"),
 *   requireOwnership(async (ctx) => {
 *     const provider = await db.provider.findFirst({ where: { userId: ctx.userId } });
 *     return provider?.id;
 *   }),
 *   createSafeAction(schema, handler)
 * );
 */
export type ActionMiddleware = (ctx: ActionContext) => Promise<void> | void;

export function composeAction<TInput, TOutput>(
  ...middlewaresAndAction: [
    ...ActionMiddleware[],
    (input: TInput) => Promise<SafeActionResult<TOutput>>,
  ]
): (input: TInput) => Promise<SafeActionResult<TOutput>> {
  const action = middlewaresAndAction.pop() as (
    input: TInput
  ) => Promise<SafeActionResult<TOutput>>;
  const middlewares = middlewaresAndAction as ActionMiddleware[];

  return async (input: TInput): Promise<SafeActionResult<TOutput>> => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        throw new UnauthorizedError();
      }

      const ctx: ActionContext = {
        userId: session.user.id,
        role: session.user.role ?? "PATIENT",
        email: session.user.email ?? "",
        ip: await getClientIp(),
      };

      // Run all middlewares
      for (const middleware of middlewares) {
        await middleware(ctx);
      }

      // Run the action
      return action(input);
    } catch (error) {
      logError(error);
      return toActionResult<TOutput>(error);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Common middleware helpers
// ─────────────────────────────────────────────────────────────────────────────

import { ForbiddenError, RoleRequiredError } from "@/lib/errors";

/**
 * Middleware that requires a specific role.
 */
export function requireRole(...roles: string[]): ActionMiddleware {
  return (ctx) => {
    if (!roles.includes(ctx.role)) {
      throw new RoleRequiredError(roles.join(" or "));
    }
  };
}

/**
 * Middleware that requires admin role.
 */
export function requireAdmin(): ActionMiddleware {
  return requireRole("ADMIN");
}

/**
 * Middleware that requires provider role.
 */
export function requireProvider(): ActionMiddleware {
  return requireRole("PROVIDER", "CLINIC_STAFF");
}

/**
 * Middleware for custom authorization checks.
 */
export function requireCondition(
  check: (ctx: ActionContext) => Promise<boolean> | boolean,
  errorMessage = "You do not have permission to perform this action"
): ActionMiddleware {
  return async (ctx) => {
    const allowed = await check(ctx);
    if (!allowed) {
      throw new ForbiddenError(errorMessage);
    }
  };
}
