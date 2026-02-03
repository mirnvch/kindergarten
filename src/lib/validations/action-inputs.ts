import { z } from "zod";

// ============================================
// Common schemas for action inputs
// ============================================

// Flexible ID schema (accepts CUID, UUID, or other valid ID formats)
// Note: Prisma uses CUID by default but we accept any reasonable ID string
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
  newRole: z.enum(["PATIENT", "PROVIDER", "CLINIC_STAFF", "ADMIN"]),
});

// ============================================
// Admin Provider Actions
// ============================================

export const approveProviderSchema = z.object({
  providerId: idSchema,
});

export const rejectProviderSchema = z.object({
  providerId: idSchema,
  reason: reasonSchema,
});

export const suspendProviderSchema = z.object({
  providerId: idSchema,
  reason: reasonSchema,
});

export const reactivateProviderSchema = z.object({
  providerId: idSchema,
});

export const deleteProviderSchema = z.object({
  providerId: idSchema,
});

export const toggleFeaturedSchema = z.object({
  providerId: idSchema,
});

// Legacy aliases for backward compatibility
export const approveDaycareSchema = approveProviderSchema;
export const rejectDaycareSchema = rejectProviderSchema;
export const suspendDaycareSchema = suspendProviderSchema;
export const reactivateDaycareSchema = reactivateProviderSchema;
export const deleteDaycareSchema = deleteProviderSchema;

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

export type ApproveProviderInput = z.infer<typeof approveProviderSchema>;
export type RejectProviderInput = z.infer<typeof rejectProviderSchema>;
export type SuspendProviderInput = z.infer<typeof suspendProviderSchema>;
export type ReactivateProviderInput = z.infer<typeof reactivateProviderSchema>;
export type DeleteProviderInput = z.infer<typeof deleteProviderSchema>;
export type ToggleFeaturedInput = z.infer<typeof toggleFeaturedSchema>;

// Legacy type aliases
export type ApproveDaycareInput = ApproveProviderInput;
export type RejectDaycareInput = RejectProviderInput;
export type SuspendDaycareInput = SuspendProviderInput;
export type ReactivateDaycareInput = ReactivateProviderInput;
export type DeleteDaycareInput = DeleteProviderInput;

export type ApproveReviewInput = z.infer<typeof approveReviewSchema>;
export type RejectReviewInput = z.infer<typeof rejectReviewSchema>;
export type DeleteReviewInput = z.infer<typeof deleteReviewSchema>;
export type ToggleVerifiedInput = z.infer<typeof toggleVerifiedSchema>;

export type ApproveVerificationInput = z.infer<typeof approveVerificationSchema>;
export type RejectVerificationInput = z.infer<typeof rejectVerificationSchema>;
export type StartReviewInput = z.infer<typeof startReviewSchema>;
