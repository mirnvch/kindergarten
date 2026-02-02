import { z } from "zod";

// Common schemas
const paginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
};

const searchSchema = {
  search: z.string().max(100).optional(),
};

// User roles enum
const userRoleSchema = z.enum(["PATIENT", "PROVIDER", "CLINIC_STAFF", "ADMIN"]);

// Provider status enum
const providerStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]);

// Verification status enum
const verificationStatusSchema = z.enum(["PENDING", "IN_REVIEW", "APPROVED", "REJECTED"]);

// Review status (custom - not a DB enum)
const reviewStatusSchema = z.enum(["all", "approved", "rejected", "verified"]);

// Rating schema (1-5)
const ratingSchema = z.coerce.number().int().min(1).max(5);

// ============================================
// Admin SearchParams Schemas
// ============================================

export const adminUsersSearchSchema = z.object({
  ...paginationSchema,
  ...searchSchema,
  role: userRoleSchema.optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export const adminProvidersSearchSchema = z.object({
  ...paginationSchema,
  ...searchSchema,
  status: providerStatusSchema.optional(),
});

// Legacy alias
export const adminDaycaresSearchSchema = adminProvidersSearchSchema;

export const adminReviewsSearchSchema = z.object({
  ...paginationSchema,
  ...searchSchema,
  status: reviewStatusSchema.optional(),
  rating: ratingSchema.optional(),
});

export const adminVerificationsSearchSchema = z.object({
  ...paginationSchema,
  status: verificationStatusSchema.optional(),
});

export const adminMessagesSearchSchema = z.object({
  ...paginationSchema,
  ...searchSchema,
});

// ============================================
// Portal SearchParams Schemas
// ============================================

export const portalAppointmentsSearchSchema = z.object({
  ...paginationSchema,
  filter: z.enum(["pending", "confirmed", "past"]).default("pending"),
});

// Legacy alias
export const portalBookingsSearchSchema = portalAppointmentsSearchSchema;

export const portalReviewsSearchSchema = z.object({
  ...paginationSchema,
  status: z.enum(["all", "responded", "unresponded"]).optional(),
});

export const portalMessagesSearchSchema = z.object({
  ...paginationSchema,
  ...searchSchema,
});

export const portalWaitlistSearchSchema = z.object({
  ...paginationSchema,
  ...searchSchema,
  status: z.enum(["all", "active", "notified", "enrolled"]).optional(),
});

// ============================================
// Public Search Params
// ============================================

export const publicSearchSchema = z.object({
  ...paginationSchema,
  query: z.string().max(200).optional(),
  state: z.string().length(2).optional(),
  city: z.string().max(100).optional(),
  specialty: z.string().max(100).optional(),
  insurance: z.string().max(100).optional(),
  telemedicine: z.coerce.boolean().optional(),
  acceptingNewPatients: z.coerce.boolean().optional(),
  language: z.string().max(50).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(100).optional(),
});

// ============================================
// Helper function to safely parse searchParams
// ============================================

export function parseSearchParams<T extends z.ZodTypeAny>(
  schema: T,
  searchParams: Record<string, string | string[] | undefined>
): z.infer<T> {
  // Convert string arrays to first value (Next.js can pass arrays)
  const normalized: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      normalized[key] = value[0];
    } else {
      normalized[key] = value;
    }
  }

  // Parse with Zod, using defaults for missing/invalid values
  const result = schema.safeParse(normalized);

  if (result.success) {
    return result.data;
  }

  // On validation error, return defaults
  // This prevents throwing errors for invalid URLs
  console.warn("SearchParams validation failed:", result.error.flatten());
  return schema.parse({});
}

// ============================================
// Type exports
// ============================================

export type AdminUsersSearch = z.infer<typeof adminUsersSearchSchema>;
export type AdminProvidersSearch = z.infer<typeof adminProvidersSearchSchema>;
export type AdminDaycaresSearch = AdminProvidersSearch; // Legacy alias
export type AdminReviewsSearch = z.infer<typeof adminReviewsSearchSchema>;
export type AdminVerificationsSearch = z.infer<typeof adminVerificationsSearchSchema>;
export type AdminMessagesSearch = z.infer<typeof adminMessagesSearchSchema>;

export type PortalAppointmentsSearch = z.infer<typeof portalAppointmentsSearchSchema>;
export type PortalBookingsSearch = PortalAppointmentsSearch; // Legacy alias
export type PortalReviewsSearch = z.infer<typeof portalReviewsSearchSchema>;
export type PortalMessagesSearch = z.infer<typeof portalMessagesSearchSchema>;
export type PortalWaitlistSearch = z.infer<typeof portalWaitlistSearchSchema>;

export type PublicSearch = z.infer<typeof publicSearchSchema>;
