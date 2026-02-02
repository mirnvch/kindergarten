/**
 * Common validation primitives for reuse across schemas.
 */

import { z } from "zod";

// ==================== ID VALIDATORS ====================

/**
 * CUID string validator (Prisma default ID format).
 */
export const cuidSchema = z.string().cuid("Invalid ID format");

/**
 * Optional CUID.
 */
export const optionalCuidSchema = z.string().cuid().optional();

/**
 * UUID string validator.
 */
export const uuidSchema = z.string().uuid("Invalid UUID format");

// ==================== STRING VALIDATORS ====================

/**
 * Non-empty string with trimming.
 */
export const nonEmptyStringSchema = z.string().min(1, "This field is required").trim();

/**
 * Email validator with normalization.
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email is too long")
  .transform((val) => val.toLowerCase().trim());

/**
 * Phone number validator (basic).
 */
export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-+()]+$/, "Invalid phone number format")
  .min(10, "Phone number is too short")
  .max(20, "Phone number is too long")
  .optional();

// ==================== DATE VALIDATORS ====================

/**
 * ISO datetime string validator.
 */
export const datetimeSchema = z.string().datetime("Invalid date/time format");

/**
 * Date string validator (YYYY-MM-DD).
 */
export const dateSchema = z.string().date("Invalid date format");

/**
 * Date that must be in the future.
 */
export const futureDateSchema = z
  .string()
  .datetime()
  .refine((val) => new Date(val) > new Date(), {
    message: "Date must be in the future",
  });

// ==================== NUMBER VALIDATORS ====================

/**
 * Positive integer validator.
 */
export const positiveIntSchema = z.number().int().positive();

/**
 * Non-negative integer validator.
 */
export const nonNegativeIntSchema = z.number().int().nonnegative();

/**
 * Pagination page number (1-indexed).
 */
export const pageSchema = z.coerce.number().int().min(1).default(1);

/**
 * Pagination page size.
 */
export const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(20);

// ==================== BOOLEAN VALIDATORS ====================

/**
 * Boolean from string (for URL params).
 */
export const booleanStringSchema = z
  .enum(["true", "false"])
  .transform((val) => val === "true");

// ==================== ENUM HELPERS ====================

/**
 * Create a Zod enum from a TypeScript enum or const array.
 * Usage: enumSchema(['ACTIVE', 'INACTIVE'] as const)
 */
export function createEnumSchema<T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values);
}

// ==================== COMPOSITE TYPES ====================

/**
 * Pagination parameters.
 */
export const paginationSchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * Sort direction.
 */
export const sortDirectionSchema = z.enum(["asc", "desc"]).default("desc");

/**
 * Generic sort parameters.
 */
export function createSortSchema<T extends readonly [string, ...string[]]>(sortableFields: T) {
  return z.object({
    sortBy: z.enum(sortableFields).optional(),
    sortDirection: sortDirectionSchema,
  });
}
