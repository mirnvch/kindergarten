"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    await db.review.update({
      where: { id: reviewId },
      data: { isApproved: true },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "REVIEW_APPROVED",
        entityType: "Review",
        entityId: reviewId,
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

    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    await db.review.update({
      where: { id: reviewId },
      data: { isApproved: false },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "REVIEW_REJECTED",
        entityType: "Review",
        entityId: reviewId,
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

    const review = await db.review.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, daycareId: true, rating: true },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    await db.review.delete({
      where: { id: reviewId },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "REVIEW_DELETED",
        entityType: "Review",
        entityId: reviewId,
        oldData: {
          userId: review.userId,
          daycareId: review.daycareId,
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

    const review = await db.review.findUnique({
      where: { id: reviewId },
      select: { id: true, isVerified: true },
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    const newVerified = !review.isVerified;

    await db.review.update({
      where: { id: reviewId },
      data: { isVerified: newVerified },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: newVerified ? "REVIEW_VERIFIED" : "REVIEW_UNVERIFIED",
        entityType: "Review",
        entityId: reviewId,
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
