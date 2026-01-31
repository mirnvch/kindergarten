import { z } from "zod";

// ============================================
// Common schemas for action inputs
// ============================================

// CUID validation (Prisma default ID format)
const cuidSchema = z.string().cuid();

// UUID validation (alternative ID format)
const uuidSchema = z.string().uuid();

// Flexible ID schema (accepts both CUID and UUID)
export const idSchema = z.string().min(1, "ID is required").max(50);

// Optional reason/note text
export const reasonSchema = z.string().max(500).optional();

// ============================================
// Admin User Actions
// ============================================

export const suspendUserSchema = z.object({
  userId: idSchema,
});

export const deleteUserSchema = z.object({
  userId: idSchema,
});

export const updateUserRoleSchema = z.object({
  userId: idSchema,
  newRole: z.enum(["PARENT", "DAYCARE_OWNER", "DAYCARE_STAFF", "ADMIN"]),
});

// ============================================
// Admin Daycare Actions
// ============================================

export const approveDaycareSchema = z.object({
  daycareId: idSchema,
});

export const rejectDaycareSchema = z.object({
  daycareId: idSchema,
  reason: reasonSchema,
});

export const suspendDaycareSchema = z.object({
  daycareId: idSchema,
  reason: reasonSchema,
});

export const reactivateDaycareSchema = z.object({
  daycareId: idSchema,
});

export const deleteDaycareSchema = z.object({
  daycareId: idSchema,
});

export const toggleFeaturedSchema = z.object({
  daycareId: idSchema,
});

// ============================================
// Admin Review Actions
// ============================================

export const approveReviewSchema = z.object({
  reviewId: idSchema,
});

export const rejectReviewSchema = z.object({
  reviewId: idSchema,
});

export const deleteReviewSchema = z.object({
  reviewId: idSchema,
});

export const toggleVerifiedSchema = z.object({
  reviewId: idSchema,
});

// ============================================
// Admin Verification Actions
// ============================================

export const approveVerificationSchema = z.object({
  requestId: idSchema,
  notes: z.string().max(1000).optional(),
});

export const rejectVerificationSchema = z.object({
  requestId: idSchema,
  reason: z.string().min(1, "Reason is required").max(1000),
});

export const startReviewSchema = z.object({
  requestId: idSchema,
});

// ============================================
// Type exports
// ============================================

export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export type ApproveDaycareInput = z.infer<typeof approveDaycareSchema>;
export type RejectDaycareInput = z.infer<typeof rejectDaycareSchema>;
export type SuspendDaycareInput = z.infer<typeof suspendDaycareSchema>;
export type ReactivateDaycareInput = z.infer<typeof reactivateDaycareSchema>;
export type DeleteDaycareInput = z.infer<typeof deleteDaycareSchema>;
export type ToggleFeaturedInput = z.infer<typeof toggleFeaturedSchema>;

export type ApproveReviewInput = z.infer<typeof approveReviewSchema>;
export type RejectReviewInput = z.infer<typeof rejectReviewSchema>;
export type DeleteReviewInput = z.infer<typeof deleteReviewSchema>;
export type ToggleVerifiedInput = z.infer<typeof toggleVerifiedSchema>;

export type ApproveVerificationInput = z.infer<typeof approveVerificationSchema>;
export type RejectVerificationInput = z.infer<typeof rejectVerificationSchema>;
export type StartReviewInput = z.infer<typeof startReviewSchema>;
