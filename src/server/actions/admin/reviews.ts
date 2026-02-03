"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  approveReviewSchema,
  rejectReviewSchema,
  deleteReviewSchema,
  toggleVerifiedSchema,
} from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function approveReview(reviewId: string) {
  try {
    const admin = await requireAdmin();

    // Rate limit check
    const rateLimitResult = await rateLimit(admin.id, "admin-moderate");
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` };
    }

    // Validate input
    const result = approveReviewSchema.safeParse({ reviewId });
    if (!result.success) {
      return { success: false, error: "Invalid review ID" };
    }

    const review = await db.review.findUnique({
      where: { id: result.data.reviewId },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    await db.review.update({
      where: { id: result.data.reviewId },
      data: { isApproved: true },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "REVIEW_APPROVED",
        entityType: "Review",
        entityId: result.data.reviewId,
        newData: { isApproved: true },
      },
    });

    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (error) {
    console.error("Error approving review:", error);
    return { success: false, error: "Failed to approve review" };
  }
}

export async function rejectReview(reviewId: string) {
  try {
    const admin = await requireAdmin();

    // Rate limit check
    const rateLimitResult = await rateLimit(admin.id, "admin-moderate");
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` };
    }

    // Validate input
    const result = rejectReviewSchema.safeParse({ reviewId });
    if (!result.success) {
      return { success: false, error: "Invalid review ID" };
    }

    const review = await db.review.findUnique({
      where: { id: result.data.reviewId },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    await db.review.update({
      where: { id: result.data.reviewId },
      data: { isApproved: false },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "REVIEW_REJECTED",
        entityType: "Review",
        entityId: result.data.reviewId,
        newData: { isApproved: false },
      },
    });

    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting review:", error);
    return { success: false, error: "Failed to reject review" };
  }
}

export async function deleteReview(reviewId: string) {
  try {
    const admin = await requireAdmin();

    // Rate limit check
    const rateLimitResult = await rateLimit(admin.id, "admin-delete-review");
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` };
    }

    // Validate input
    const result = deleteReviewSchema.safeParse({ reviewId });
    if (!result.success) {
      return { success: false, error: "Invalid review ID" };
    }

    const review = await db.review.findUnique({
      where: { id: result.data.reviewId },
      select: { id: true, userId: true, providerId: true, rating: true },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    await db.review.delete({
      where: { id: result.data.reviewId },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "REVIEW_DELETED",
        entityType: "Review",
        entityId: result.data.reviewId,
        oldData: {
          userId: review.userId,
          providerId: review.providerId,
          rating: review.rating,
        },
      },
    });

    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return { success: false, error: "Failed to delete review" };
  }
}

export async function toggleVerified(reviewId: string) {
  try {
    const admin = await requireAdmin();

    // Rate limit check
    const rateLimitResult = await rateLimit(admin.id, "admin-moderate");
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return { success: false, error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` };
    }

    // Validate input
    const result = toggleVerifiedSchema.safeParse({ reviewId });
    if (!result.success) {
      return { success: false, error: "Invalid review ID" };
    }

    const review = await db.review.findUnique({
      where: { id: result.data.reviewId },
      select: { id: true, isVerified: true },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    const newVerified = !review.isVerified;

    await db.review.update({
      where: { id: result.data.reviewId },
      data: { isVerified: newVerified },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: newVerified ? "REVIEW_VERIFIED" : "REVIEW_UNVERIFIED",
        entityType: "Review",
        entityId: result.data.reviewId,
        newData: { isVerified: newVerified },
      },
    });

    revalidatePath("/admin/reviews");
    return { success: true, isVerified: newVerified };
  } catch (error) {
    console.error("Error toggling verified:", error);
    return { success: false, error: "Failed to toggle verified status" };
  }
}
